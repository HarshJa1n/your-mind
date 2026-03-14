import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return _genAI;
}

export interface AIProcessingResult {
  summary: string;
  tags: string[];
  category: string;
  detectedLanguage: string;
  title: string;
}

/**
 * Extract article text from a URL using Mozilla Readability-style extraction.
 * Falls back to basic HTML extraction for now.
 */
export async function extractArticleContent(url: string): Promise<{
  title: string;
  content: string;
  description: string;
  image: string | null;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; YourMind/1.0; +https://yourmind.app)",
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i
    );
    const title = ogTitleMatch?.[1] || titleMatch?.[1] || url;

    // Extract description
    const ogDescMatch = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i
    );
    const descMatch = html.match(
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i
    );
    const description = ogDescMatch?.[1] || descMatch?.[1] || "";

    // Extract OG image
    const ogImageMatch = html.match(
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i
    );
    const image = ogImageMatch?.[1] || null;

    // Extract body text (strip tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || html;
    const content = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 8000); // Limit to 8k chars for Gemini

    return { title: title.trim(), content, description, image };
  } catch {
    return { title: url, content: "", description: "", image: null };
  }
}

/**
 * Use Gemini Flash to generate summary, tags, category, and detect language.
 */
export async function processWithGemini(
  text: string,
  title: string,
  targetLanguage: string
): Promise<AIProcessingResult> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analyze this content and respond with a JSON object only (no markdown, no explanation).

Title: ${title}
Content (first 4000 chars): ${text.substring(0, 4000)}

Respond with exactly this JSON structure:
{
  "title": "clean, concise title in the ORIGINAL content language",
  "summary": "2-3 sentence summary in the ORIGINAL content language",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "one of: article, recipe, product, book, research, tutorial, news, design, code, other",
  "detectedLanguage": "ISO 639-1 code e.g. en, hi, es, fr, ja, ko, zh"
}

Rules:
- Keep title and summary in the ORIGINAL language of the content
- Tags should be 1-3 word concepts, in English
- Category should be the most fitting single category
- detectedLanguage must be the language of the ORIGINAL content`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Strip markdown code blocks if present
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);
    return {
      title: parsed.title || title,
      summary: parsed.summary || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || "article",
      detectedLanguage: parsed.detectedLanguage || "en",
    };
  } catch {
    return {
      title,
      summary: text.substring(0, 200),
      tags: [],
      category: "article",
      detectedLanguage: "en",
    };
  }
}

/**
 * Process an image with Gemini Flash (vision).
 * Returns AI-generated title, summary, description, tags, category.
 */
export async function processImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _preferredLanguage: string
): Promise<AIProcessingResult & { description: string }> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const base64Data = imageBuffer.toString("base64");

  const prompt = `Analyze this image. Respond with a JSON object only (no markdown, no extra text).

{
  "title": "concise descriptive title",
  "description": "detailed 2-3 sentence description of what is shown",
  "summary": "2-3 sentence summary with context",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "one of: photo, art, design, screenshot, diagram, product, other"
}`;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Data } },
      { text: prompt },
    ] as Parameters<typeof model.generateContent>[0]);
    const responseText = result.response.text().trim();
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(jsonText);
    return {
      title: parsed.title || "Untitled Image",
      summary: parsed.summary || parsed.description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || "photo",
      detectedLanguage: "en",
      description: parsed.description || parsed.summary || "",
    };
  } catch {
    return {
      title: "Untitled Image",
      summary: "",
      tags: [],
      category: "photo",
      detectedLanguage: "en",
      description: "",
    };
  }
}

/**
 * Process audio with Gemini Flash (audio understanding + transcription).
 */
export async function processAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _preferredLanguage: string
): Promise<AIProcessingResult & { transcript: string }> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const base64Data = audioBuffer.toString("base64");

  const prompt = `Analyze this audio. Respond with a JSON object only (no markdown, no extra text).

{
  "title": "concise title for this audio",
  "transcript": "full transcription of spoken words, or description of music/sounds",
  "summary": "2-3 sentence summary of the audio content",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "one of: speech, music, podcast, lecture, interview, meeting, other",
  "detectedLanguage": "ISO 639-1 language code e.g. en, hi, es"
}`;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Data } },
      { text: prompt },
    ] as Parameters<typeof model.generateContent>[0]);
    const responseText = result.response.text().trim();
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(jsonText);
    return {
      title: parsed.title || "Untitled Audio",
      summary: parsed.summary || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || "speech",
      detectedLanguage: parsed.detectedLanguage || "en",
      transcript: parsed.transcript || "",
    };
  } catch {
    return {
      title: "Untitled Audio",
      summary: "",
      tags: [],
      category: "speech",
      detectedLanguage: "en",
      transcript: "",
    };
  }
}

/**
 * Translate text to the target language using Gemini.
 */
export async function translateWithGemini(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  if (!text.trim()) return text;

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const langNames: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    ko: "Korean",
    zh: "Simplified Chinese",
    ar: "Arabic",
    pt: "Portuguese",
    ru: "Russian",
    it: "Italian",
  };

  const targetLangName = langNames[targetLanguage] || targetLanguage;

  // Skip translation if already in target language
  if (sourceLanguage && sourceLanguage === targetLanguage) return text;

  try {
    const result = await model.generateContent(
      `Translate the following text to ${targetLangName}. Return only the translated text, no explanation:\n\n${text}`
    );
    return result.response.text().trim();
  } catch {
    return text;
  }
}

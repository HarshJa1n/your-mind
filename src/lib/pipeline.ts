/**
 * YourMind AI Pipeline
 *
 * On save:
 *   1. Extract content (article text, metadata)
 *   2. Embed with Gemini Embedding 2 → store in Chroma (keyed by item UUID)
 *   3. Generate summary + tags + category + language detection (Gemini Flash)
 *   4. Translate summary, tags, title to user's preferred language (Gemini Flash)
 *   5. Store metadata in Supabase items table (chroma_id = item UUID)
 *
 * On search:
 *   1. Embed query with Gemini Embedding 2
 *   2. Query Chroma collection for nearest neighbors
 *   3. Fetch metadata for matched IDs from Supabase
 *   4. Return with similarity scores
 */

import { getUserCollection } from "./chroma";
import {
  extractArticleContent,
  processWithGemini,
  translateWithGemini,
} from "./gemini";
import { createClient as createSupabaseClient } from "./supabase/server";
import { v4 as uuidv4 } from "uuid";

export interface SaveURLInput {
  url: string;
  userId: string;
  preferredLanguage: string;
}

export interface SaveNoteInput {
  title: string;
  content: string;
  userId: string;
  preferredLanguage: string;
}

export interface PipelineResult {
  itemId: string;
  success: boolean;
  error?: string;
}

/**
 * Full pipeline for saving a URL (article).
 * Returns immediately with a placeholder item, processes in background.
 */
export async function saveURLPipeline(
  input: SaveURLInput
): Promise<PipelineResult> {
  const { url, userId, preferredLanguage } = input;
  const supabase = await createSupabaseClient();
  const itemId = uuidv4();

  // 1. Insert placeholder item immediately (optimistic UI)
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const { error: insertError } = await supabase.from("items").insert({
    id: itemId,
    user_id: userId,
    content_type: "article",
    source_url: url,
    original_title: hostname,
    translated_title: hostname,
    translated_language: preferredLanguage,
    auto_tags: [],
  });

  if (insertError) {
    return { itemId, success: false, error: insertError.message };
  }

  // 2. Process in background (non-blocking)
  processURLBackground({ url, userId, itemId, preferredLanguage }).catch(
    console.error
  );

  return { itemId, success: true };
}

async function processURLBackground({
  url,
  userId,
  itemId,
  preferredLanguage,
}: {
  url: string;
  userId: string;
  itemId: string;
  preferredLanguage: string;
}) {
  const supabase = await createSupabaseClient();

  try {
    // 1. Extract article content
    const { title, content, description, image } =
      await extractArticleContent(url);
    const textToEmbed = `${title}\n\n${description}\n\n${content}`.substring(
      0,
      10000
    );

    // 2. AI Processing: summary, tags, category, language detection
    const aiResult = await processWithGemini(
      textToEmbed,
      title,
      preferredLanguage
    );

    // 3. Translate to user's preferred language
    const [translatedTitle, translatedSummary] = await Promise.all([
      aiResult.detectedLanguage !== preferredLanguage
        ? translateWithGemini(
            aiResult.title,
            preferredLanguage,
            aiResult.detectedLanguage
          )
        : Promise.resolve(aiResult.title),
      aiResult.detectedLanguage !== preferredLanguage
        ? translateWithGemini(
            aiResult.summary,
            preferredLanguage,
            aiResult.detectedLanguage
          )
        : Promise.resolve(aiResult.summary),
    ]);

    // Translate tags to user language
    const tagsText = aiResult.tags.join(", ");
    const translatedTagsText =
      preferredLanguage !== "en"
        ? await translateWithGemini(tagsText, preferredLanguage, "en")
        : tagsText;
    const translatedTags = translatedTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // 4. Embed text + store in Chroma
    const collection = await getUserCollection(userId);
    await collection.add({
      ids: [itemId],
      documents: [textToEmbed],
      metadatas: [
        {
          supabaseId: itemId,
          userId,
          contentType: "article",
          url,
        },
      ],
    });

    // 5. Update Supabase with full metadata
    await supabase
      .from("items")
      .update({
        original_title: aiResult.title,
        original_summary: aiResult.summary,
        original_content: content.substring(0, 20000),
        original_language: aiResult.detectedLanguage,
        translated_title: translatedTitle,
        translated_summary: translatedSummary,
        translated_language: preferredLanguage,
        auto_tags: translatedTags,
        auto_tags_original: aiResult.tags,
        content_category: aiResult.category,
        thumbnail_url: image,
        chroma_id: itemId,
      })
      .eq("id", itemId);
  } catch (err) {
    console.error("Background URL processing failed:", err);
  }
}

/**
 * Full pipeline for saving a note.
 */
export async function saveNotePipeline(
  input: SaveNoteInput
): Promise<PipelineResult> {
  const { title, content, userId, preferredLanguage } = input;
  const supabase = await createSupabaseClient();
  const itemId = uuidv4();

  // 1. Insert placeholder immediately
  const { error: insertError } = await supabase.from("items").insert({
    id: itemId,
    user_id: userId,
    content_type: "note",
    original_title: title,
    original_content: content,
    original_summary: content.substring(0, 200),
    translated_title: title,
    translated_summary: content.substring(0, 200),
    translated_language: preferredLanguage,
    auto_tags: [],
  });

  if (insertError) {
    return { itemId, success: false, error: insertError.message };
  }

  // 2. Process in background
  processNoteBackground({
    title,
    content,
    userId,
    itemId,
    preferredLanguage,
  }).catch(console.error);

  return { itemId, success: true };
}

async function processNoteBackground({
  title,
  content,
  userId,
  itemId,
  preferredLanguage,
}: {
  title: string;
  content: string;
  userId: string;
  itemId: string;
  preferredLanguage: string;
}) {
  const supabase = await createSupabaseClient();

  try {
    const textToEmbed = `${title}\n\n${content}`;

    // AI processing
    const aiResult = await processWithGemini(content, title, preferredLanguage);

    // Translate if needed
    const [translatedTitle, translatedSummary] = await Promise.all([
      aiResult.detectedLanguage !== preferredLanguage
        ? translateWithGemini(title, preferredLanguage, aiResult.detectedLanguage)
        : Promise.resolve(title),
      aiResult.detectedLanguage !== preferredLanguage
        ? translateWithGemini(
            aiResult.summary,
            preferredLanguage,
            aiResult.detectedLanguage
          )
        : Promise.resolve(aiResult.summary),
    ]);

    const tagsText = aiResult.tags.join(", ");
    const translatedTagsText =
      preferredLanguage !== "en"
        ? await translateWithGemini(tagsText, preferredLanguage, "en")
        : tagsText;
    const translatedTags = translatedTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Embed + store in Chroma
    const collection = await getUserCollection(userId);
    await collection.add({
      ids: [itemId],
      documents: [textToEmbed],
      metadatas: [{ supabaseId: itemId, userId, contentType: "note" }],
    });

    // Update Supabase
    await supabase
      .from("items")
      .update({
        original_language: aiResult.detectedLanguage,
        original_summary: aiResult.summary,
        translated_title: translatedTitle,
        translated_summary: translatedSummary,
        translated_language: preferredLanguage,
        auto_tags: translatedTags,
        auto_tags_original: aiResult.tags,
        content_category: aiResult.category,
        chroma_id: itemId,
      })
      .eq("id", itemId);
  } catch (err) {
    console.error("Background note processing failed:", err);
  }
}

/**
 * Semantic search using Chroma + Gemini Embedding 2.
 */
export async function semanticSearch(
  query: string,
  userId: string,
  limit = 20
) {
  const supabase = await createSupabaseClient();

  // 1. Get Chroma collection and query by embedding
  const collection = await getUserCollection(userId);
  const results = await collection.query({
    queryTexts: [query],
    nResults: limit,
    include: ["distances", "metadatas"],
  });

  if (!results.ids[0] || results.ids[0].length === 0) {
    return [];
  }

  // 2. Extract IDs and distances
  const ids = results.ids[0];
  const distances = results.distances?.[0] ?? [];

  // Convert cosine distance → similarity score
  const similarities = distances.map((d: number | null) =>
    d === null ? 0 : Math.max(0, Math.min(1, 1 - d))
  );

  // 3. Fetch full metadata from Supabase
  const { data: items } = await supabase
    .from("items")
    .select(
      "id, content_type, original_title, translated_title, original_summary, translated_summary, translated_language, auto_tags, thumbnail_url, source_url, content_category, created_at"
    )
    .in("id", ids)
    .eq("user_id", userId);

  if (!items) return [];

  // 4. Re-order to match Chroma result order and attach similarity
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return ids
    .map((id: string, i: number) => {
      const item = itemMap.get(id);
      if (!item) return null;
      return { ...item, similarity: similarities[i] };
    })
    .filter(Boolean);
}

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
  extractArticleMetadata,
  extractArticleContent,
  processWithGemini,
  processImageWithGemini,
  processAudioWithGemini,
  processUrlWithGeminiContext,
} from "./gemini";
import { translateMeta, translateTags } from "./lingo";
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
    let title: string;
    let content: string;
    let description: string;
    let image: string | null;
    let aiResult: Awaited<ReturnType<typeof processWithGemini>>;

    // 1. Prefer Gemini URL Context so Gemini can fetch/index the page directly.
    const urlContextResult = await processUrlWithGeminiContext(url);

    if (urlContextResult) {
      title = urlContextResult.title;
      content = urlContextResult.content;
      description = urlContextResult.description;
      image = urlContextResult.image;
      aiResult = {
        title: urlContextResult.title,
        summary: urlContextResult.summary,
        tags: urlContextResult.tags,
        category: urlContextResult.category,
        detectedLanguage: urlContextResult.detectedLanguage,
      };

      // If URL Context skips OG metadata, do a light fetch to recover title/image.
      if (!image || !description) {
        const metadata = await extractArticleMetadata(url);
        title = title || metadata.title;
        description = description || metadata.description;
        image = image || metadata.image;
      }
    } else {
      // Fallback: local fetch + scrape + Gemini analysis.
      const extracted = await extractArticleContent(url);
      title = extracted.title;
      content = extracted.content;
      description = extracted.description;
      image = extracted.image;

      const textForAnalysis = `${title}\n\n${description}\n\n${content}`.substring(
        0,
        10000
      );

      aiResult = await processWithGemini(
        textForAnalysis,
        title,
        preferredLanguage
      );
    }

    const textToEmbed = `${title}\n\n${description}\n\n${content}`.substring(0, 10000);

    // 3. Translate title + summary via Lingo.dev SDK (Layer 2)
    const { title: translatedTitle, summary: translatedSummary } =
      await translateMeta(
        { title: aiResult.title, summary: aiResult.summary },
        aiResult.detectedLanguage || "en",
        preferredLanguage
      );

    // Translate tags via Lingo.dev SDK (Layer 2)
    const translatedTags = await translateTags(
      aiResult.tags,
      aiResult.detectedLanguage || "en",
      preferredLanguage
    );

    // 4. Embed text + store in Chroma (optional — don't block Supabase update)
    let chromaId: string | null = null;
    try {
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
      chromaId = itemId;
    } catch (chromaErr) {
      console.warn("Chroma embedding failed (search will use text fallback):", chromaErr);
    }

    // 5. Update Supabase with full metadata — always runs even if Chroma failed
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
        chroma_id: chromaId,
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

    // Translate title + summary via Lingo.dev SDK (Layer 2)
    const { title: translatedTitle, summary: translatedSummary } =
      await translateMeta(
        { title, summary: aiResult.summary },
        aiResult.detectedLanguage || "en",
        preferredLanguage
      );

    // Translate tags via Lingo.dev SDK (Layer 2)
    const translatedTags = await translateTags(
      aiResult.tags,
      aiResult.detectedLanguage || "en",
      preferredLanguage
    );

    // Embed + store in Chroma (optional)
    let chromaId: string | null = null;
    try {
      const collection = await getUserCollection(userId);
      await collection.add({
        ids: [itemId],
        documents: [textToEmbed],
        metadatas: [{ supabaseId: itemId, userId, contentType: "note" }],
      });
      chromaId = itemId;
    } catch (chromaErr) {
      console.warn("Chroma embedding failed (search will use text fallback):", chromaErr);
    }

    // Update Supabase — always runs
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
        chroma_id: chromaId,
      })
      .eq("id", itemId);
  } catch (err) {
    console.error("Background note processing failed:", err);
  }
}

export interface SaveFileInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  userId: string;
  preferredLanguage: string;
}

/**
 * Full pipeline for saving an image.
 */
export async function saveImagePipeline(
  input: SaveFileInput
): Promise<PipelineResult> {
  const { buffer, mimeType, fileName, userId, preferredLanguage } = input;
  const supabase = await createSupabaseClient();
  const itemId = uuidv4();

  const { error: insertError } = await supabase.from("items").insert({
    id: itemId,
    user_id: userId,
    content_type: "image",
    original_title: fileName,
    translated_title: fileName,
    translated_language: preferredLanguage,
    auto_tags: [],
  });

  if (insertError) return { itemId, success: false, error: insertError.message };

  processImageBackground({
    buffer,
    mimeType,
    fileName,
    userId,
    itemId,
    preferredLanguage,
  }).catch(console.error);

  return { itemId, success: true };
}

async function processImageBackground({
  buffer,
  mimeType,
  fileName,
  userId,
  itemId,
  preferredLanguage,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  userId: string;
  itemId: string;
  preferredLanguage: string;
}) {
  const supabase = await createSupabaseClient();
  void fileName;
  try {
    const aiResult = await processImageWithGemini(buffer, mimeType, preferredLanguage);

    const { title: translatedTitle, summary: translatedSummary } =
      await translateMeta(
        { title: aiResult.title, summary: aiResult.summary },
        "en",
        preferredLanguage
      );
    const translatedTags = await translateTags(aiResult.tags, "en", preferredLanguage);

    const textToEmbed = `${aiResult.title}\n\n${aiResult.description}\n\n${aiResult.summary}`;
    let chromaId: string | null = null;
    try {
      const collection = await getUserCollection(userId);
      await collection.add({
        ids: [itemId],
        documents: [textToEmbed],
        metadatas: [{ supabaseId: itemId, userId, contentType: "image" }],
      });
      chromaId = itemId;
    } catch (chromaErr) {
      console.warn("Chroma embedding failed (search will use text fallback):", chromaErr);
    }

    // Upload to Supabase Storage (requires 'uploads' bucket with public access)
    let thumbnailUrl: string | null = null;
    try {
      const ext = (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const storagePath = `${userId}/${itemId}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from("uploads")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
      if (!storageError) {
        thumbnailUrl = supabase.storage
          .from("uploads")
          .getPublicUrl(storagePath).data.publicUrl;
      }
    } catch {
      // Storage not configured — thumbnail will be null
    }

    await supabase
      .from("items")
      .update({
        original_title: aiResult.title,
        original_summary: aiResult.summary,
        original_content: aiResult.description,
        original_language: "en",
        translated_title: translatedTitle,
        translated_summary: translatedSummary,
        translated_language: preferredLanguage,
        auto_tags: translatedTags,
        auto_tags_original: aiResult.tags,
        content_category: aiResult.category,
        thumbnail_url: thumbnailUrl,
        chroma_id: chromaId,
      })
      .eq("id", itemId);
  } catch (err) {
    console.error("Background image processing failed:", err);
  }
}

/**
 * Full pipeline for saving audio.
 */
export async function saveAudioPipeline(
  input: SaveFileInput
): Promise<PipelineResult> {
  const { buffer, mimeType, fileName, userId, preferredLanguage } = input;
  const supabase = await createSupabaseClient();
  const itemId = uuidv4();

  const { error: insertError } = await supabase.from("items").insert({
    id: itemId,
    user_id: userId,
    content_type: "audio",
    original_title: fileName,
    translated_title: fileName,
    translated_language: preferredLanguage,
    auto_tags: [],
  });

  if (insertError) return { itemId, success: false, error: insertError.message };

  processAudioBackground({
    buffer,
    mimeType,
    fileName,
    userId,
    itemId,
    preferredLanguage,
  }).catch(console.error);

  return { itemId, success: true };
}

async function processAudioBackground({
  buffer,
  mimeType,
  fileName,
  userId,
  itemId,
  preferredLanguage,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  userId: string;
  itemId: string;
  preferredLanguage: string;
}) {
  const supabase = await createSupabaseClient();
  void fileName;
  try {
    const aiResult = await processAudioWithGemini(buffer, mimeType, preferredLanguage);

    const { title: translatedTitle, summary: translatedSummary } =
      await translateMeta(
        { title: aiResult.title, summary: aiResult.summary },
        aiResult.detectedLanguage || "en",
        preferredLanguage
      );
    const translatedTags = await translateTags(
      aiResult.tags,
      aiResult.detectedLanguage || "en",
      preferredLanguage
    );

    const textToEmbed = `${aiResult.title}\n\n${aiResult.transcript}\n\n${aiResult.summary}`;
    let chromaId: string | null = null;
    try {
      const collection = await getUserCollection(userId);
      await collection.add({
        ids: [itemId],
        documents: [textToEmbed],
        metadatas: [{ supabaseId: itemId, userId, contentType: "audio" }],
      });
      chromaId = itemId;
    } catch (chromaErr) {
      console.warn("Chroma embedding failed (search will use text fallback):", chromaErr);
    }

    // Update Supabase — always runs
    await supabase
      .from("items")
      .update({
        original_title: aiResult.title,
        original_summary: aiResult.summary,
        original_content: aiResult.transcript,
        original_language: aiResult.detectedLanguage,
        translated_title: translatedTitle,
        translated_summary: translatedSummary,
        translated_language: preferredLanguage,
        auto_tags: translatedTags,
        auto_tags_original: aiResult.tags,
        content_category: aiResult.category,
        chroma_id: chromaId,
      })
      .eq("id", itemId);
  } catch (err) {
    console.error("Background audio processing failed:", err);
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

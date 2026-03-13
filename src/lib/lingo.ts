/**
 * Lingo.dev SDK wrapper — runtime translation engine
 *
 * Layer 2 (on save): pre-translate summaries + tags → stored in Supabase
 * Layer 3 (on demand): translate full article content → cached in translations_cache
 */

import { LingoDotDevEngine } from "lingo.dev/sdk";

let _engine: LingoDotDevEngine | null = null;

export function getLingo(): LingoDotDevEngine {
  if (!_engine) {
    // Compiler uses LINGODOTDEV_API_KEY, SDK accepts either
    const apiKey = process.env.LINGODOTDEV_API_KEY || process.env.LINGO_API_KEY;
    _engine = new LingoDotDevEngine({ apiKey: apiKey! });
  }
  return _engine;
}

/**
 * Translate {title, summary} object in one batch call.
 * Used in Layer 2 pipeline on save.
 */
export async function translateMeta(
  meta: { title: string; summary: string },
  sourceLocale: string,
  targetLocale: string
): Promise<{ title: string; summary: string }> {
  if (sourceLocale === targetLocale) return meta;
  const engine = getLingo();
  const result = await engine.localizeObject(meta, {
    sourceLocale,
    targetLocale,
    fast: true,
  });
  return { title: result.title as string, summary: result.summary as string };
}

/**
 * Translate an array of tag strings in one batch call.
 * Used in Layer 2 pipeline on save.
 */
export async function translateTags(
  tags: string[],
  sourceLocale: string,
  targetLocale: string
): Promise<string[]> {
  if (sourceLocale === targetLocale || tags.length === 0) return tags;
  const engine = getLingo();
  return engine.localizeStringArray(tags, { sourceLocale, targetLocale, fast: true });
}

/**
 * Translate full article/note content.
 * Used in Layer 3 on-demand API route.
 */
export async function translateContent(
  content: string,
  sourceLocale: string,
  targetLocale: string
): Promise<string> {
  if (sourceLocale === targetLocale) return content;
  const engine = getLingo();
  return engine.localizeText(content, { sourceLocale, targetLocale });
}

/**
 * Detect the language of a given text using Lingo.dev.
 */
export async function detectLocale(text: string): Promise<string> {
  const engine = getLingo();
  return engine.recognizeLocale(text.substring(0, 500));
}

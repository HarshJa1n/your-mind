/**
 * Layer 3 — On-demand full content translation
 *
 * POST /api/items/:id/translate
 * Body: { targetLocale: string }
 *
 * 1. Check translations_cache — return immediately if cached
 * 2. Fetch original_content from items table
 * 3. Translate via Lingo.dev SDK
 * 4. Store in translations_cache
 * 5. Return translated content
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateContent } from "@/lib/lingo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { targetLocale } = await request.json();

  if (!targetLocale) {
    return NextResponse.json({ error: "targetLocale required" }, { status: 400 });
  }

  // 1. Check cache first
  const { data: cached } = await supabase
    .from("translations_cache")
    .select("translated_content")
    .eq("item_id", id)
    .eq("target_language", targetLocale)
    .single();

  if (cached) {
    return NextResponse.json({
      content: cached.translated_content,
      cached: true,
    });
  }

  // 2. Fetch item (verify ownership + get content)
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("original_content, original_language, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (!item.original_content) {
    return NextResponse.json({ error: "No content to translate" }, { status: 400 });
  }

  // 3. Translate via Lingo.dev SDK
  const translated = await translateContent(
    item.original_content,
    item.original_language || "en",
    targetLocale
  );

  // 4. Store in cache
  await supabase.from("translations_cache").upsert({
    item_id: id,
    target_language: targetLocale,
    translated_content: translated,
  });

  return NextResponse.json({ content: translated, cached: false });
}

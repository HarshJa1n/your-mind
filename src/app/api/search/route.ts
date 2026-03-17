import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { semanticSearch } from "@/lib/pipeline";

async function runTextFallbackSearch(
  query: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: results } = await supabase
    .from("items")
    .select(
      "id, content_type, original_title, translated_title, original_summary, translated_summary, translated_language, auto_tags, thumbnail_url, source_url, content_category, created_at"
    )
    .eq("user_id", userId)
    .or(
      `original_title.ilike.%${query}%,original_summary.ilike.%${query}%,translated_title.ilike.%${query}%,translated_summary.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  return (results || []).map((item) => ({
    ...item,
    similarity: 0.7,
  }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    // Semantic search via Chroma + Gemini Embedding 2
    const results = await semanticSearch(query.trim(), user.id, 20);
    if (results.length === 0) {
      const fallbackResults = await runTextFallbackSearch(query.trim(), user.id, supabase);
      return NextResponse.json({ results: fallbackResults });
    }
    return NextResponse.json({ results });
  } catch (err) {
    // Fallback to text search if Chroma/Gemini unavailable
    console.error("Semantic search failed, falling back to text search:", err);
    const fallbackResults = await runTextFallbackSearch(query.trim(), user.id, supabase);
    return NextResponse.json({ results: fallbackResults });
  }
}

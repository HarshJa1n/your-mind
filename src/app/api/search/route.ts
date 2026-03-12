import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // TODO: Embed query with Gemini Embedding 2 and use pgvector similarity search
  // For now, do a basic text search as placeholder
  const { data: results, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .or(
      `original_title.ilike.%${query}%,original_summary.ilike.%${query}%,translated_title.ilike.%${query}%,translated_summary.ilike.%${query}%,original_content.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add mock similarity for now
  const resultsWithSimilarity = (results || []).map((item) => ({
    ...item,
    similarity: 0.85,
  }));

  return NextResponse.json({ results: resultsWithSimilarity });
}

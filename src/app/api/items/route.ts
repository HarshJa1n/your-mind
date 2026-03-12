import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type } = body;

  // Get user's preferred language
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();

  const preferredLanguage = profile?.preferred_language || "en";

  if (type === "note") {
    const { title, content } = body;

    // For now, insert the note directly. AI pipeline will be added next.
    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        content_type: "note",
        original_title: title,
        original_content: content,
        original_summary: content.substring(0, 200),
        translated_language: preferredLanguage,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  }

  if (type === "url") {
    const { url } = body;

    // For now, insert basic URL item. Full extraction pipeline will be added.
    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        content_type: "article",
        source_url: url,
        original_title: url,
        translated_language: preferredLanguage,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveURLPipeline, saveNotePipeline } from "@/lib/pipeline";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();

  const preferredLanguage = profile?.preferred_language || "en";

  if (type === "url") {
    const { url } = body;
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await saveURLPipeline({
      url,
      userId: user.id,
      preferredLanguage,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ itemId: result.itemId, processing: true });
  }

  if (type === "note") {
    const { title, content } = body;
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const result = await saveNotePipeline({
      title,
      content,
      userId: user.id,
      preferredLanguage,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ itemId: result.itemId, processing: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

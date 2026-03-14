import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  saveURLPipeline,
  saveNotePipeline,
  saveImagePipeline,
  saveAudioPipeline,
} from "@/lib/pipeline";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  const { data: items, error, count } = await supabase
    .from("items")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: items || [],
    total: count || 0,
    hasMore: offset + limit < (count || 0),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();

  const preferredLanguage = profile?.preferred_language || "en";

  const contentType = request.headers.get("content-type") || "";

  // ── File upload (image or audio) ─────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;
    const fileName = file.name;

    if (type === "image") {
      const result = await saveImagePipeline({
        buffer,
        mimeType,
        fileName,
        userId: user.id,
        preferredLanguage,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ itemId: result.itemId, processing: true });
    }

    if (type === "audio") {
      const result = await saveAudioPipeline({
        buffer,
        mimeType,
        fileName,
        userId: user.id,
        preferredLanguage,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ itemId: result.itemId, processing: true });
    }

    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // ── JSON body (url or note) ───────────────────────────────────────────────
  const body = await request.json();
  const { type } = body;

  if (type === "url") {
    const { url } = body;
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    const result = await saveURLPipeline({ url, userId: user.id, preferredLanguage });
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

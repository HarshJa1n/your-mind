/**
 * POST /api/extension/save
 *
 * Browser extension endpoint — saves a URL for the authenticated user.
 * Accepts session cookie (same as the web app) or Bearer token in the future.
 *
 * Body: { url: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveURLPipeline } from "@/lib/pipeline";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();

  const preferredLanguage = profile?.preferred_language || "en";

  const result = await saveURLPipeline({ url, userId: user.id, preferredLanguage });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ itemId: result.itemId, processing: true });
}

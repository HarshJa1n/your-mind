import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { language } = await request.json();

  if (!language) {
    return NextResponse.json({ error: "Language is required" }, { status: 400 });
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_language: language })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: Trigger background re-translation of all user's item summaries/tags
  // This will use Lingo.dev SDK to re-translate existing content

  return NextResponse.json({ success: true });
}

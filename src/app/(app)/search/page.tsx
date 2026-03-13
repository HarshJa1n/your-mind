import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import SearchContent from "./search-content";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles").select("preferred_language").eq("id", user!.id).single();

  const locale = profile?.preferred_language || "en";
  const messages = await getMessages(locale);

  return <SearchContent messages={messages} />;
}

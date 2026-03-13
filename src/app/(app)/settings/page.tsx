import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import SettingsContent from "./settings-content";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles").select("preferred_language").eq("id", user!.id).single();

  const locale = profile?.preferred_language || "en";
  const messages = await getMessages(locale);

  return <SettingsContent messages={messages} initialLanguage={locale} />;
}

import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import SettingsContent from "./settings-content";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const supabase = await createClient();
  await supabase.auth.getUser();

  const messages = await getMessages(lang);

  return <SettingsContent messages={messages} initialLanguage={lang} />;
}

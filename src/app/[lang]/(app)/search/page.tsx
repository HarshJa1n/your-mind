import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import SearchContent from "./search-content";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const supabase = await createClient();
  await supabase.auth.getUser();

  const messages = await getMessages(lang);

  return <SearchContent messages={messages} locale={lang} />;
}

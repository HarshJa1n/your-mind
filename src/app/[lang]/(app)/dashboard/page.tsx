import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard-content";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ save?: string; title?: string }>;
}) {
  const [{ lang }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const autoSaveUrl = searchParams.save || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const messages = await getMessages(lang);

  return (
    <DashboardContent
      items={items || []}
      preferredLanguage={lang}
      messages={messages}
      autoSaveUrl={autoSaveUrl}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard-content";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user!.id)
    .single();

  const locale = profile?.preferred_language || "en";
  const messages = await getMessages(locale);

  return (
    <DashboardContent
      items={items || []}
      preferredLanguage={locale}
      messages={messages}
    />
  );
}

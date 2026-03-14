import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { getMessages } from "@/lib/i18n";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const messages = await getMessages(lang);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar user={user} profile={profile} messages={messages} lang={lang} />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}

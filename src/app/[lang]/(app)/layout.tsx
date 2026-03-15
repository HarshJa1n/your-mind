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
    <div className="app-shell min-h-screen lg:flex">
      <Sidebar user={user} profile={profile} messages={messages} lang={lang} />
      <main className="min-h-screen flex-1 px-4 pb-8 pt-4 lg:px-0 lg:pb-10 lg:pr-5 lg:pt-5">
        {children}
      </main>
    </div>
  );
}

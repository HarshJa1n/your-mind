import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { getMessages } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const locale = profile?.preferred_language || "en";
  const messages = await getMessages(locale);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar user={user} profile={profile} messages={messages} />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}

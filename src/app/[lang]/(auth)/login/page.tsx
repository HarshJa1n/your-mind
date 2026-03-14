import { getMessages } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const messages = await getMessages(lang);
  return <LoginForm lang={lang} messages={messages} />;
}

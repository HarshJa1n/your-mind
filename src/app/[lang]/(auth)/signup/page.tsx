import { getMessages } from "@/lib/i18n";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const messages = await getMessages(lang);
  return <SignupForm lang={lang} messages={messages} />;
}

export async function generateStaticParams() {
  return [
    { lang: "en" },
    { lang: "hi" },
    { lang: "es" },
    { lang: "fr" },
    { lang: "de" },
    { lang: "ja" },
  ];
}

export default function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

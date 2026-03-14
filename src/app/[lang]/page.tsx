import Link from "next/link";
import { Brain, Globe, Search, Sparkles } from "lucide-react";
import { getMessages, createTranslator } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const messages = await getMessages(lang);
  const t = createTranslator(messages);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-accent" />
          <span className="text-xl font-bold tracking-tight">YourMind</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLang={lang} />
          <Link
            href={`/${lang}/login`}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href={`/${lang}/signup`}
            className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground mb-8">
          <Globe className="h-4 w-4" />
          <span>{t("landing.badge")}</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          {t("landing.headline1")}
          <br />
          <span className="text-accent">{t("landing.headline2")}</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          {t("landing.subheadline")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/${lang}/signup`}
            className="px-8 py-3.5 text-base font-semibold bg-accent text-accent-foreground rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("landing.ctaPrimary")}
          </Link>
          <Link
            href="#features"
            className="px-8 py-3.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t("landing.ctaSecondary")}
          </Link>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Globe className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("landing.feature1Title")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("landing.feature1Desc")}</p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Search className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("landing.feature2Title")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("landing.feature2Desc")}</p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("landing.feature3Title")}</h3>
            <p className="text-muted-foreground leading-relaxed">{t("landing.feature3Desc")}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <span>YourMind</span>
          </div>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

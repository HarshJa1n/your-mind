import Link from "next/link";
import { Globe, Search, Sparkles, ArrowRight, ScanSearch, Languages } from "lucide-react";
import { getMessages, createTranslator } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const messages = await getMessages(lang);
  const t = createTranslator(messages);

  return (
    <div className="app-shell min-h-screen overflow-x-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
        <BrandLogo href={`/${lang}`} />
        <div className="flex items-center gap-2 self-center">
          <LanguageSwitcher currentLang={lang} />
          <Link
            href={`/${lang}/login`}
            className="glass-panel inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href={`/${lang}/signup`}
            className="inline-flex min-h-11 items-center justify-center self-center rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] hover:-translate-y-0.5"
          >
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pt-8">
          <div>
            <h1 className="font-display max-w-4xl text-5xl font-bold leading-[0.98] tracking-[-0.06em] text-balance sm:text-6xl lg:text-8xl">
              {t("landing.headline1")}
              <span className="hero-text-gradient block">{t("landing.headline2")}</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {t("landing.subheadline")}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${lang}/signup`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-7 py-3 text-base font-semibold text-white shadow-[0_22px_50px_rgba(255,0,140,0.24)] hover:-translate-y-0.5"
              >
                {t("landing.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="glass-panel inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-base font-semibold text-foreground"
              >
                {t("landing.ctaSecondary")}
              </Link>
            </div>
          </div>

          <GlowCard className="mx-auto w-full max-w-xl">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] p-4 sm:p-5">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,0,140,0.24),transparent_70%)]" />
              <div className="relative rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(24,8,17,0.96),rgba(57,11,39,0.95))] p-5 text-white shadow-[0_24px_60px_rgba(15,2,10,0.4)]">
                <div className="mb-4 flex items-center justify-between">
                  <BrandLogo showWordmark={false} size="sm" />
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-white/70">
                    {t("landing.showcaseBadge")}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <Languages className="h-5 w-5 text-pink-200" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{t("landing.feature3Title")}</p>
                        <p className="text-xs text-white/60">{t("landing.feature3Desc")}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-white/82">{t("landing.subheadline")}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                      <ScanSearch className="mb-3 h-5 w-5 text-pink-200" />
                      <p className="text-sm font-semibold">{t("landing.feature2Title")}</p>
                      <p className="mt-1 text-sm text-white/65">
                        {t("landing.feature2Desc")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                      <Sparkles className="mb-3 h-5 w-5 text-pink-200" />
                      <p className="text-sm font-semibold">{t("landing.feature1Title")}</p>
                      <p className="mt-1 text-sm text-white/65">
                        {t("landing.feature1Desc")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>
        </section>

        <section id="features" className="pt-24">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                {t("landing.sectionEyebrow")}
              </p>
              <h2 className="font-display text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
                {t("landing.sectionTitle")}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <GlowCard>
              <div className="p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {t("landing.feature1Title")}
                </h3>
                <p className="leading-7 text-muted-foreground">{t("landing.feature1Desc")}</p>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-white">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {t("landing.feature2Title")}
                </h3>
                <p className="leading-7 text-muted-foreground">{t("landing.feature2Desc")}</p>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {t("landing.feature3Title")}
                </h3>
                <p className="leading-7 text-muted-foreground">{t("landing.feature3Desc")}</p>
              </div>
            </GlowCard>
          </div>
        </section>

        <footer className="mt-24 border-t border-white/50 pt-8">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo href={`/${lang}`} size="sm" />
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

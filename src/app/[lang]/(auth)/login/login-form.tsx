"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import type en from "../../../../../locales/en.json";

type Messages = typeof en;

export function LoginForm({ lang, messages }: { lang: string; messages: Messages }) {
  const t = createTranslator(messages);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(`/${lang}/dashboard`);
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden lg:block">
          <GlowCard>
            <div className="rounded-[calc(1.5rem-1px)] bg-[linear-gradient(180deg,#170710,#3f0b2b_55%,#74004c)] p-8 text-white">
              <BrandLogo showWordmark={false} size="lg" />
              <h1 className="font-display mt-8 text-5xl font-bold leading-[1] tracking-[-0.06em]">
                {t("auth.signInPanelTitle")}
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-white/72">
                {t("auth.signInPanelBody")}
              </p>
              <div className="mt-10 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
                  <p className="mb-2 text-sm font-semibold">{t("auth.signInPanelPoint1Title")}</p>
                  <p className="text-sm text-white/68">
                    {t("auth.signInPanelPoint1Desc")}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
                  <p className="mb-2 text-sm font-semibold">{t("auth.signInPanelPoint2Title")}</p>
                  <p className="text-sm text-white/68">
                    {t("auth.signInPanelPoint2Desc")}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        <GlowCard className="mx-auto w-full max-w-lg">
          <div className="p-6 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <BrandLogo href={`/${lang}`} size="sm" />
              <LanguageSwitcher currentLang={lang} />
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                {t("auth.signInEyebrow")}
              </div>
              <h1 className="font-display text-4xl font-bold tracking-[-0.05em]">
                {t("auth.welcomeBack")}
              </h1>
              <p className="mt-2 text-muted-foreground">{t("auth.signInSubtitle")}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  {t("auth.emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="glass-panel min-h-12 w-full rounded-2xl px-4 py-3 text-card-foreground focus:outline-none"
                  placeholder={t("auth.emailPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  {t("auth.passwordLabel")}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="glass-panel min-h-12 w-full rounded-2xl px-4 py-3 text-card-foreground focus:outline-none"
                  placeholder={t("auth.passwordPlaceholder")}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signIn")}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">{t("common.or")}</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="glass-panel flex min-h-12 w-full items-center justify-center gap-3 rounded-full px-5 py-3 font-medium"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("auth.continueWithGoogle")}
            </button>

            <p className="mt-7 text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link href={`/${lang}/signup`} className="font-semibold text-accent hover:underline">
                {t("auth.signUp")}
              </Link>
            </p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

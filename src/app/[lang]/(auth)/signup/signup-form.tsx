"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import type en from "../../../../../locales/en.json";

type Messages = typeof en;

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
];

export function SignupForm({ lang, messages }: { lang: string; messages: Messages }) {
  const t = createTranslator(messages);
  const [step, setStep] = useState<"credentials" | "language">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }
    setStep("language");
  }

  async function handleComplete() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { preferred_language: selectedLanguage } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: selectedLanguage })
        .eq("id", user.id);
    }
    router.push(`/${selectedLanguage}/dashboard`);
    router.refresh();
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
  }

  // ── Language picker step ──────────────────────────────────────────────
  if (step === "language") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Brain className="h-8 w-8 text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-1">{t("auth.chooseLanguage")}</h1>
            <p className="text-muted-foreground">{t("auth.chooseLanguageSubtitle")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLanguage(l.code)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLanguage === l.code
                    ? "border-accent bg-accent/5 ring-2 ring-accent"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{l.native}</p>
                    <p className="text-xs text-muted-foreground">{l.name}</p>
                  </div>
                  {selectedLanguage === l.code && (
                    <Check className="h-4 w-4 text-accent" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.startUsing")}
          </button>

          <button
            onClick={() => setStep("credentials")}
            className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t("auth.back")}
          </button>
        </div>
      </div>
    );
  }

  // ── Credentials step ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher currentLang={lang} />
        </div>

        <div className="text-center mb-8">
          <Link href={`/${lang}`} className="inline-flex items-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold tracking-tight">YourMind</span>
          </Link>
          <h1 className="text-2xl font-semibold mb-1">{t("auth.createAccount")}</h1>
          <p className="text-muted-foreground">{t("auth.signUpSubtitle")}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              {t("auth.emailLabel")}
            </label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              {t("auth.passwordLabel")}
            </label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={6} autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.passwordMin")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("auth.continue")}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t("common.or")}</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full py-2.5 border border-border rounded-lg font-medium hover:bg-secondary transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("auth.continueWithGoogle")}
        </button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href={`/${lang}/login`} className="text-accent hover:underline font-medium">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}

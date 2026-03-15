"use client";

import { useState } from "react";
import { Check, Globe, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import type en from "../../../../../locales/en.json";

type Messages = typeof en;

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "\u0939\u093f\u0928\u094d\u0926\u0940" },
  { code: "es", name: "Spanish", native: "Espa\u00f1ol" },
  { code: "fr", name: "French", native: "Fran\u00e7ais" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "\u65e5\u672c\u8a9e" },
];

export default function SettingsContent({
  messages,
  initialLanguage,
}: {
  messages: Messages;
  initialLanguage: string;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();
  const t = createTranslator(messages);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ preferred_language: selectedLanguage }).eq("id", user.id);
      await fetch("/api/user/language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: selectedLanguage }),
      });
    }
    setSaving(false);
    setSaved(true);
    // Navigate to the new locale URL — middleware sets cookie on arrival
    window.location.href = `/${selectedLanguage}/settings`;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4 lg:hidden">
        <BrandLogo href={`/${initialLanguage}/dashboard`} size="sm" />
      </div>

      <GlowCard>
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#16060f,#3f0b2b_56%,#75004d)] p-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Profile
            </div>
            <h1 className="font-display mt-6 text-4xl font-bold tracking-[-0.05em]">
              {t("settings.title")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/68">
              {t("settings.subtitle")}
            </p>
          </div>

          <div>
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Globe className="h-4 w-4 text-accent" />
              {t("settings.languageTitle")}
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{t("settings.languageSubtitle")}</p>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={cn(
                    "glass-panel rounded-[1.35rem] p-4 text-left",
                    selectedLanguage === lang.code
                      ? "border-accent/30 bg-accent text-accent-foreground shadow-[0_16px_36px_rgba(255,0,140,0.22)]"
                      : "hover:bg-white/80"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{lang.native}</p>
                      <p
                        className={cn(
                          "text-xs",
                          selectedLanguage === lang.code
                            ? "text-accent-foreground/75"
                            : "text-muted-foreground"
                        )}
                      >
                        {lang.name}
                      </p>
                    </div>
                    {selectedLanguage === lang.code && <Check className="h-4 w-4" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? t("settings.saved") : t("settings.saveChanges")}
            </button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import type en from "../../../../locales/en.json";

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
    setTimeout(() => setSaved(false), 2000);
    // Reload so the UI re-renders with the new locale
    window.location.reload();
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{t("settings.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("settings.subtitle")}</p>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">{t("settings.languageTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("settings.languageSubtitle")}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedLanguage === lang.code
                  ? "border-accent bg-accent/5 ring-2 ring-accent"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{lang.native}</p>
                  <p className="text-xs text-muted-foreground">{lang.name}</p>
                </div>
                {selectedLanguage === lang.code && <Check className="h-4 w-4 text-accent" />}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? t("settings.saved") : t("settings.saveChanges")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  StickyNote,
  FileAudio,
  File,
  Globe,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import type en from "../../../../../../locales/en.json";

type Messages = typeof en;

interface Item {
  id: string;
  content_type: string;
  original_title: string | null;
  translated_title: string | null;
  original_summary: string | null;
  translated_summary: string | null;
  original_content: string | null;
  original_language: string | null;
  translated_language: string | null;
  auto_tags: string[];
  thumbnail_url: string | null;
  source_url: string | null;
  content_category: string | null;
  chroma_id: string | null;
  created_at: string;
}

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  article: FileText,
  note: StickyNote,
  image: ImageIcon,
  pdf: File,
  audio: FileAudio,
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  article:
    "border border-sky-200/80 bg-sky-50 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  note:
    "border border-amber-200/80 bg-amber-50 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  image:
    "border border-pink-200/80 bg-pink-50 text-pink-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  pdf:
    "border border-rose-200/80 bg-rose-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  audio:
    "border border-violet-200/80 bg-violet-50 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
};

export default function ItemDetailContent({
  item,
  locale,
  messages,
}: {
  item: Item;
  locale: string;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
  const colorClass = CONTENT_TYPE_COLORS[item.content_type] || CONTENT_TYPE_COLORS.article;

  const title = item.translated_title || item.original_title || t("common.untitled");
  const summary = item.translated_summary || item.original_summary;

  const originalLang = item.original_language || "en";
  // Need to translate if content language differs from user locale
  const needsContentTranslation =
    !!item.original_content && originalLang !== locale;

  const displayContent = showOriginal
    ? item.original_content
    : translatedContent || item.original_content;

  // Layer 3: auto-translate full content on page open, cache aggressively
  useEffect(() => {
    if (!needsContentTranslation) return;

    async function autoTranslate() {
      setTranslating(true);
      setTranslationError("");
      try {
        const res = await fetch(`/api/items/${item.id}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLocale: locale }),
        });
        if (!res.ok) throw new Error("Translation failed");
        const data = await res.json();
        setTranslatedContent(data.content);
      } catch {
        setTranslationError(t("common.error"));
      } finally {
        setTranslating(false);
      }
    }

    autoTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, locale]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Link
          href={`/${locale}/dashboard`}
          className="glass-panel inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.dashboard")}
        </Link>
        <div className="lg:hidden">
          <BrandLogo href={`/${locale}/dashboard`} size="sm" />
        </div>
      </div>

      <GlowCard>
        <div className="p-6 sm:p-8">
          {item.thumbnail_url && (
            <div className="mb-6 aspect-video w-full overflow-hidden rounded-[1.6rem] bg-muted">
              <img
                src={item.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${colorClass}`}>
              <Icon className="h-3 w-3" />
              {t(`contentTypes.${item.content_type}`)}
            </span>
            {needsContentTranslation && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                {originalLang.toUpperCase()} &#8594; {locale.toUpperCase()}
              </span>
            )}
            {item.content_category && (
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
                {item.content_category}
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-[-0.05em] sm:text-5xl">
            {title}
          </h1>

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {(() => {
                try { return new URL(item.source_url).hostname.replace("www.", ""); }
                catch { return item.source_url; }
              })()}
            </a>
          )}

          {item.auto_tags && item.auto_tags.length > 0 && (
            <div className="mb-6 mt-5 flex flex-wrap gap-2">
              {item.auto_tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {summary && (
            <div className="mb-8 rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(255,0,140,0.08),rgba(255,255,255,0.72))] p-5">
              <p className="text-sm leading-7 text-muted-foreground">{summary}</p>
            </div>
          )}

          {item.original_content && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {translatedContent && !showOriginal
                    ? t("itemDetail.contentLabelTranslated", { locale: locale.toUpperCase() })
                    : t("itemDetail.contentLabel")}
                </h2>
                <div className="flex items-center gap-3">
                  {needsContentTranslation && translating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("itemDetail.translating")}
                    </span>
                  )}
                  {translatedContent && needsContentTranslation && !translating && (
                    <button
                      onClick={() => setShowOriginal((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Sparkles className="h-3 w-3" />
                      {showOriginal
                        ? t("itemDetail.viewTranslated")
                        : t("itemDetail.viewOriginal")}
                    </button>
                  )}
                </div>
              </div>

              {translationError && (
                <p className="mb-3 text-sm text-destructive">{translationError}</p>
              )}

              {translating && !translatedContent ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <span
                      key={i}
                      className="block h-3.5 rounded bg-muted animate-pulse"
                      style={{ width: `${95 - i * 4}%` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.6rem] bg-white/74 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <p className="whitespace-pre-wrap text-sm leading-8 text-foreground/88">
                    {displayContent}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </GlowCard>
    </div>
  );
}

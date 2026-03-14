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
} from "lucide-react";
import { createTranslator } from "@/lib/i18n";
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
  article: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  note: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  image: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
  pdf: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  audio: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
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
    <div className="max-w-3xl mx-auto p-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nav.dashboard")}
      </Link>

      {/* Thumbnail */}
      {item.thumbnail_url && (
        <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-muted">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${colorClass}`}>
          <Icon className="h-3 w-3" />
          {item.content_type}
        </span>
        {needsContentTranslation && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground bg-muted">
            <Globe className="h-3 w-3" />
            {originalLang.toUpperCase()} &#8594; {locale.toUpperCase()}
          </span>
        )}
        {item.content_category && (
          <span className="px-2 py-1 rounded-md text-xs bg-secondary text-secondary-foreground">
            {item.content_category}
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-snug mb-3">{title}</h1>

      {/* Source */}
      {item.source_url && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mb-4"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {(() => {
            try { return new URL(item.source_url).hostname.replace("www.", ""); }
            catch { return item.source_url; }
          })()}
        </a>
      )}

      {/* Tags */}
      {item.auto_tags && item.auto_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {item.auto_tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Summary — Layer 2 already translated at save time */}
      {summary && (
        <div className="bg-secondary/50 rounded-xl p-5 mb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
      )}

      {/* Full Content — Layer 3 auto-translated on open, cached */}
      {item.original_content && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {translatedContent && !showOriginal
                ? `Content (${locale.toUpperCase()})`
                : "Content"}
            </h2>
            <div className="flex items-center gap-3">
              {needsContentTranslation && translating && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Translating...
                </span>
              )}
              {translatedContent && needsContentTranslation && !translating && (
                <button
                  onClick={() => setShowOriginal((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
                >
                  {showOriginal
                    ? t("itemDetail.viewTranslated")
                    : t("itemDetail.viewOriginal")}
                </button>
              )}
            </div>
          </div>

          {translationError && (
            <p className="text-sm text-destructive mb-3">{translationError}</p>
          )}

          {translating && !translatedContent ? (
            // Skeleton while translating
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="block h-3.5 bg-muted rounded animate-pulse"
                  style={{ width: `${95 - i * 4}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {displayContent}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

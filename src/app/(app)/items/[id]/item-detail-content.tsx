"use client";

import { useState } from "react";
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
  Languages,
} from "lucide-react";
import { createTranslator } from "@/lib/i18n";
import type en from "../../../../../locales/en.json";

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

  const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
  const colorClass = CONTENT_TYPE_COLORS[item.content_type] || CONTENT_TYPE_COLORS.article;

  const title = item.translated_title || item.original_title || t("common.untitled");
  const summary = item.translated_summary || item.original_summary;
  const isTranslated =
    item.original_language &&
    item.translated_language &&
    item.original_language !== item.translated_language;

  const displayContent = translatedContent || item.original_content;
  const needsTranslation =
    !translatedContent &&
    item.original_content &&
    isTranslated &&
    locale !== "en";

  async function handleTranslate() {
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

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${colorClass}`}>
          <Icon className="h-3 w-3" />
          {item.content_type}
        </span>
        {isTranslated && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground bg-muted">
            <Globe className="h-3 w-3" />
            {item.original_language?.toUpperCase()} → {item.translated_language?.toUpperCase()}
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

      {/* Summary */}
      {summary && (
        <div className="bg-secondary/50 rounded-xl p-5 mb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
      )}

      {/* Full Content */}
      {item.original_content && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {translatedContent ? `Content (${item.translated_language?.toUpperCase()})` : "Content"}
            </h2>
            {needsTranslation && (
              <button
                onClick={handleTranslate}
                disabled={translating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Languages className="h-3.5 w-3.5" />
                )}
                {translating ? t("saveModal.saving") : `Translate to ${item.translated_language?.toUpperCase()}`}
              </button>
            )}
          </div>
          {translationError && (
            <p className="text-sm text-destructive mb-3">{translationError}</p>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {displayContent}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  Globe,
  FileText,
  StickyNote,
  Image as ImageIcon,
  FileAudio,
  File,
  ArrowRight,
} from "lucide-react";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import type en from "../../../../../locales/en.json";

type Messages = typeof en;

interface SearchResult {
  id: string;
  content_type: string;
  original_title: string | null;
  translated_title: string | null;
  original_summary: string | null;
  translated_summary: string | null;
  translated_language: string | null;
  auto_tags: string[];
  thumbnail_url: string | null;
  source_url: string | null;
  similarity: number;
  created_at: string;
}

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  article: FileText,
  note: StickyNote,
  image: ImageIcon,
  pdf: File,
  audio: FileAudio,
};

export default function SearchContent({
  messages,
  locale,
}: {
  messages: Messages;
  locale: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const t = createTranslator(messages);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4 lg:hidden">
        <BrandLogo href={`/${locale}/dashboard`} size="sm" />
      </div>

      <GlowCard className="mb-6">
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Discover
            </p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.05em]">
              {t("search.title")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("search.subtitle")}</p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="glass-panel min-h-14 w-full rounded-[1.6rem] pl-14 pr-32 text-base text-card-foreground"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(255,0,140,0.22)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search.searchButton")}
            </button>
          </form>
        </div>
      </GlowCard>

      {loading && (
        <div className="glass-panel flex items-center justify-center rounded-[1.5rem] py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="glass-panel rounded-[1.5rem] py-16 text-center">
          <p className="text-muted-foreground">{t("search.noResults", { query })}</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => {
            const Icon = CONTENT_TYPE_ICONS[result.content_type] || FileText;
            const title = result.translated_title || result.original_title || t("common.untitled");
            const summary = result.translated_summary || result.original_summary;
            return (
              <GlowCard key={result.id}>
                <Link href={`/${locale}/items/${result.id}`} className="block p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    {result.thumbnail_url && (
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
                        <img src={result.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold capitalize text-accent">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {result.content_type}
                        </span>
                        {result.translated_language && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            {result.translated_language.toUpperCase()}
                          </span>
                        )}
                        <span className="ml-auto text-xs font-medium text-muted-foreground">
                          {t("search.match", { percent: String(Math.round(result.similarity * 100)) })}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-bold tracking-[-0.03em]">{title}</h3>
                      {summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{summary}</p>}
                      {result.auto_tags && result.auto_tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {result.auto_tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-white/70 px-3 py-1 text-xs text-secondary-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              </GlowCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search as SearchIcon, Loader2, Globe, FileText, StickyNote, Image as ImageIcon, FileAudio, File } from "lucide-react";

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Search your mind</h1>
        <p className="text-muted-foreground">
          Type in any language — find content saved in every language
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search concepts, not keywords..."
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => {
            const Icon = CONTENT_TYPE_ICONS[result.content_type] || FileText;
            const title = result.translated_title || result.original_title || "Untitled";
            const summary = result.translated_summary || result.original_summary;

            return (
              <div
                key={result.id}
                className="p-5 bg-card border border-border rounded-xl hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {result.thumbnail_url && (
                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={result.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground capitalize">
                        {result.content_type}
                      </span>
                      {result.translated_language && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {result.translated_language.toUpperCase()}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                      {title}
                    </h3>
                    {summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {summary}
                      </p>
                    )}
                    {result.auto_tags && result.auto_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {result.auto_tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

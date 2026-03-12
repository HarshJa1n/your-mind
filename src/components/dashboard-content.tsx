"use client";

import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  StickyNote,
  FileAudio,
  File,
  Globe,
  Plus,
  X,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Item {
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
  content_category: string | null;
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
  article: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  note: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  image: "bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  pdf: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  audio: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
};

export function DashboardContent({
  items,
  preferredLanguage,
}: {
  items: Item[];
  preferredLanguage: string;
}) {
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Mind</h1>
          <p className="text-muted-foreground mt-1">
            {items.length === 0
              ? "Save your first item to get started"
              : `${items.length} items saved`}
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Save new
        </button>
      </div>

      {/* Content grid */}
      {items.length === 0 ? (
        <EmptyState onAdd={() => setShowSaveModal(true)} />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
  const colorClass =
    CONTENT_TYPE_COLORS[item.content_type] || CONTENT_TYPE_COLORS.article;
  const title = item.translated_title || item.original_title || "Untitled";
  const summary = item.translated_summary || item.original_summary;

  return (
    <div className="break-inside-avoid bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
      {/* Thumbnail */}
      {item.thumbnail_url && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${colorClass}`}
        >
          <Icon className="h-3 w-3" />
          {item.content_type}
        </span>
        {item.translated_language && item.translated_language !== item.content_category && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground bg-muted">
            <Globe className="h-3 w-3" />
            {item.translated_language.toUpperCase()}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
        {title}
      </h3>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
          {summary}
        </p>
      )}

      {/* Tags */}
      {item.auto_tags && item.auto_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.auto_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source */}
      {item.source_url && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">
            {new URL(item.source_url).hostname}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Your mind is empty</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Save articles, notes, images, and more. Everything will be organized and
        presented in your language.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        Save your first item
      </button>
    </div>
  );
}

function SaveModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"url" | "note">("url");
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          title: noteTitle,
          content: noteContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold">Save to YourMind</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mx-6 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setMode("url")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              mode === "url"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            URL
          </button>
          <button
            onClick={() => setMode("note")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              mode === "note"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Note
          </button>
        </div>

        <div className="p-6">
          {mode === "url" ? (
            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1.5">
                  Paste a URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save article
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label htmlFor="note-title" className="block text-sm font-medium mb-1.5">
                  Title
                </label>
                <input
                  id="note-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  placeholder="Note title"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="note-content" className="block text-sm font-medium mb-1.5">
                  Content
                </label>
                <textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                  rows={5}
                  placeholder="Write your note..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save note
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  Sparkles,
  ExternalLink,
  Music,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import type en from "../../locales/en.json";

type Messages = typeof en;

interface Item {
  id: string;
  content_type: string;
  original_title: string | null;
  translated_title: string | null;
  original_summary: string | null;
  translated_summary: string | null;
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

const PROCESSING_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes → mark as failed

function isProcessing(item: Item): boolean {
  if (item.chroma_id || item.original_summary) return false;
  const age = Date.now() - new Date(item.created_at).getTime();
  return age < PROCESSING_TIMEOUT_MS;
}

function isFailed(item: Item): boolean {
  if (item.chroma_id || item.original_summary) return false;
  const age = Date.now() - new Date(item.created_at).getTime();
  return age >= PROCESSING_TIMEOUT_MS;
}

// ─── File Drop Zone ────────────────────────────────────────────────────────
function FileDropZone({
  accept,
  hint,
  label,
  file,
  onFileSelect,
  icon: Icon,
}: {
  accept: string;
  hint: string;
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFileSelect(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "glass-panel rounded-[1.35rem] border-2 border-dashed p-6 text-center",
        dragOver ? "border-accent bg-accent/5" : "hover:border-accent/50",
        file ? "border-green-500/50 bg-green-50/10" : ""
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 justify-center">
          <Icon className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-sm font-medium truncate max-w-[220px]">{file.name}</span>
        </div>
      ) : (
        <div>
          <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{hint}</p>
        </div>
      )}
    </div>
  );
}

// ─── Save Modal ────────────────────────────────────────────────────────────
function SaveModal({
  onClose,
  t,
}: {
  onClose: () => void;
  t: ReturnType<typeof createTranslator>;
}) {
  const [mode, setMode] = useState<"url" | "note" | "image" | "audio">("url");
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        throw new Error(data.error || t("common.error"));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
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
        body: JSON.stringify({ type: "note", title: noteTitle, content: noteContent }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.error"));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFile(fileType: "image" | "audio") {
    const file = fileType === "image" ? imageFile : audioFile;
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("type", fileType);
      formData.append("file", file);
      const res = await fetch("/api/items", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.error"));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { key: "url", icon: LinkIcon, label: t("saveModal.urlTab") },
    { key: "note", icon: StickyNote, label: t("saveModal.noteTab") },
    { key: "image", icon: ImageIcon, label: t("saveModal.imageTab") },
    { key: "audio", icon: FileAudio, label: t("saveModal.audioTab") },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,6,14,0.55)] backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlowCard className="w-full max-w-xl">
        <div className="w-full p-1">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Capture
            </p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em]">
              {t("saveModal.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="glass-panel flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-6 mb-0 flex gap-1 rounded-[1.2rem] bg-secondary/70 p-1.5">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                mode === key
                  ? "bg-white text-foreground shadow-[0_10px_24px_rgba(31,7,26,0.08)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {/* URL tab */}
          {mode === "url" && (
            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1.5">
                  {t("saveModal.urlLabel")}
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  autoFocus
                  placeholder={t("saveModal.urlPlaceholder")}
                  className="glass-panel w-full rounded-2xl px-4 py-3 focus:outline-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("saveModal.saving")}
                  </>
                ) : (
                  t("saveModal.saveArticle")
                )}
              </button>
            </form>
          )}

          {/* Note tab */}
          {mode === "note" && (
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label htmlFor="note-title" className="block text-sm font-medium mb-1.5">
                  {t("saveModal.noteTitleLabel")}
                </label>
                <input
                  id="note-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  autoFocus
                  placeholder={t("saveModal.noteTitlePlaceholder")}
                  className="glass-panel w-full rounded-2xl px-4 py-3 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="note-content" className="block text-sm font-medium mb-1.5">
                  {t("saveModal.noteContentLabel")}
                </label>
                <textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                  rows={5}
                  placeholder={t("saveModal.noteContentPlaceholder")}
                  className="glass-panel w-full rounded-2xl px-4 py-3 focus:outline-none resize-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("saveModal.saving")}
                  </>
                ) : (
                  t("saveModal.saveNote")
                )}
              </button>
            </form>
          )}

          {/* Image tab */}
          {mode === "image" && (
            <div className="space-y-4">
              <FileDropZone
                accept="image/jpeg,image/png,image/gif,image/webp"
                hint={t("saveModal.imageHint")}
                label={t("saveModal.dropOrClick")}
                file={imageFile}
                onFileSelect={setImageFile}
                icon={ImageIcon}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                onClick={() => handleSaveFile("image")}
                disabled={loading || !imageFile}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("saveModal.saving")}
                  </>
                ) : (
                  t("saveModal.saveImage")
                )}
              </button>
            </div>
          )}

          {/* Audio tab */}
          {mode === "audio" && (
            <div className="space-y-4">
              <FileDropZone
                accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/mp4"
                hint={t("saveModal.audioHint")}
                label={t("saveModal.dropOrClick")}
                file={audioFile}
                onFileSelect={setAudioFile}
                icon={FileAudio}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                onClick={() => handleSaveFile("audio")}
                disabled={loading || !audioFile}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("saveModal.saving")}
                  </>
                ) : (
                  t("saveModal.saveAudio")
                )}
              </button>
            </div>
          )}
        </div>
        </div>
      </GlowCard>
    </div>
  );
}

// ─── Item Card ─────────────────────────────────────────────────────────────
function ItemCard({
  item,
  locale,
  t,
}: {
  item: Item;
  locale: string;
  t: ReturnType<typeof createTranslator>;
}) {
  const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
  const colorClass =
    CONTENT_TYPE_COLORS[item.content_type] || CONTENT_TYPE_COLORS.article;
  const processing = isProcessing(item);
  const failed = isFailed(item);
  const title =
    item.translated_title || item.original_title || t("common.untitled");
  const summary = item.translated_summary || item.original_summary;

  const sourceHostname = (() => {
    if (!item.source_url) return null;
    try {
      return new URL(item.source_url).hostname.replace("www.", "");
    } catch {
      return null;
    }
  })();

  // Failed items: non-clickable error card
  if (failed) {
    return (
      <GlowCard className="mb-4 block break-inside-avoid" innerClassName="p-5 border-destructive/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-destructive/70 shrink-0" />
          <span className="text-xs font-medium text-destructive/80">{t("dashboard.processingFailed")}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {item.original_title || t("common.untitled")}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          {t("dashboard.processingFailedMsg")}
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard
      className="mb-4 block break-inside-avoid"
      innerClassName={cn(
        "p-5 transition-all group",
        processing && "animate-pulse-soft",
        processing && "pointer-events-none"
      )}
    >
      <Link href={`/${locale}/items/${item.id}`} className="block">
      {/* Image thumbnail */}
      {item.content_type === "image" && item.thumbnail_url && !processing && (
        <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-[1.2rem] bg-muted">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Article thumbnail */}
      {item.content_type !== "image" && item.thumbnail_url && !processing && (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-[1.2rem] bg-muted">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Audio placeholder */}
      {item.content_type === "audio" && !processing && (
        <div className="mb-4 flex h-16 w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(255,0,140,0.08),rgba(255,255,255,0.7))]">
          <Music className="h-5 w-5 text-purple-500" />
          <div className="flex items-end gap-0.5 h-6">
            {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-purple-400 dark:bg-purple-500"
                style={{ height: `${h * 3}px` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Processing state */}
      {processing && (
        <div className="mb-4 flex aspect-video w-full items-center justify-center rounded-[1.2rem] bg-muted/60">
          <Sparkles
            className="h-6 w-6 text-accent/50 animate-spin"
            style={{ animationDuration: "3s" }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${colorClass}`}>
          <Icon className="h-3 w-3" />
          {t(`contentTypes.${item.content_type}`)}
        </span>
        {!processing &&
          item.original_language &&
          item.original_language !== item.translated_language && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              {item.original_language.toUpperCase()} →{" "}
              {item.translated_language?.toUpperCase()}
            </span>
          )}
        {processing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("dashboard.processing")}
          </span>
        )}
      </div>

      <h3 className="font-display mb-2 text-xl font-bold leading-snug tracking-[-0.04em] group-hover:text-accent">
        {processing ? (
          <span className="inline-block w-3/4 h-4 bg-muted rounded animate-pulse" />
        ) : (
          title
        )}
      </h3>

      {processing ? (
        <div className="space-y-1.5 mb-3">
          <span className="block h-3 bg-muted rounded animate-pulse w-full" />
          <span className="block h-3 bg-muted rounded animate-pulse w-5/6" />
          <span className="block h-3 bg-muted rounded animate-pulse w-4/6" />
        </div>
      ) : summary ? (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
          {summary}
        </p>
      ) : null}

      {!processing && item.auto_tags && item.auto_tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {item.auto_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/70 px-3 py-1 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {sourceHostname && (
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground truncate">{sourceHostname}</p>
          {item.source_url && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(item.source_url!, "_blank", "noopener,noreferrer");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      </Link>
    </GlowCard>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────
function EmptyState({
  onAdd,
  t,
}: {
  onAdd: () => void;
  t: ReturnType<typeof createTranslator>;
}) {
  return (
    <GlowCard className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-white shadow-[0_20px_44px_rgba(255,0,140,0.24)]">
        <Plus className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="font-display mb-2 text-3xl font-bold tracking-[-0.04em]">{t("dashboard.emptyTitle")}</h2>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {t("dashboard.emptySubtitle")}
      </p>
      <button
        onClick={onAdd}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-6 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)]"
      >
        {t("dashboard.saveFirstItem")}
      </button>
      </div>
    </GlowCard>
  );
}

// ─── Dashboard Content ─────────────────────────────────────────────────────
type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export function DashboardContent({
  items: initialItems,
  preferredLanguage,
  messages,
  autoSaveUrl,
}: {
  items: Item[];
  preferredLanguage: string;
  messages: Messages;
  autoSaveUrl?: string | null;
}) {
  const [allItems, setAllItems] = useState<Item[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= 20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const t = createTranslator(messages);

  const hasProcessing = allItems.some(isProcessing);

  // ── Polling: update processing items ──────────────────────────────────
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/items?limit=20&offset=0");
      if (!res.ok) return;
      const data = await res.json();
      const freshItems: Item[] = data.items || [];
      setAllItems((prev) => {
        const freshMap = new Map(freshItems.map((i) => [i.id, i]));
        const prevIds = new Set(prev.map((i) => i.id));
        // Update existing items + prepend brand-new ones
        const updated = prev.map((item) => freshMap.get(item.id) || item);
        const brandNew = freshItems.filter((i) => !prevIds.has(i.id));
        return [...brandNew, ...updated];
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(fetchLatest, 4000);
    return () => clearInterval(interval);
  }, [hasProcessing, fetchLatest]);

  // ── Auto-save from Chrome extension (?save= param) ────────────────────
  useEffect(() => {
    if (!autoSaveUrl) return;
    setAutoSaveStatus("saving");
    fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: autoSaveUrl }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setAutoSaveStatus("saved");
        fetchLatest();
        // Remove ?save= from URL without page reload
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", `/${preferredLanguage}/dashboard`);
        }
        setTimeout(() => setAutoSaveStatus("idle"), 4000);
      })
      .catch(() => {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 4000);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveUrl]);

  // ── Infinite scroll ────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/items?offset=${allItems.length}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const newItems: Item[] = data.items || [];
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const deduped = newItems.filter((i) => !existingIds.has(i.id));
        return [...prev, ...deduped];
      });
      setHasMore(data.hasMore ?? false);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, allItems.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Smart Spaces (category filter) ────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(
      allItems.map((i) => i.content_category).filter(Boolean) as string[]
    );
    return Array.from(cats).sort();
  }, [allItems]);

  const filteredItems =
    activeCategory === "all"
      ? allItems
      : allItems.filter((i) => i.content_category === activeCategory);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 lg:hidden">
            <BrandLogo href={`/${preferredLanguage}/dashboard`} size="sm" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.05em]">{t("dashboard.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {allItems.length === 0
              ? t("dashboard.emptySubtitle")
              : t("dashboard.itemsCount", { count: allItems.length })}
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)]"
        >
          <Plus className="h-4 w-4" />
          {t("nav.saveNew")}
        </button>
      </div>

      {/* Smart Spaces filter chips */}
      {categories.length > 0 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-all border ${
              activeCategory === "all"
                ? "bg-accent text-accent-foreground border-accent shadow-[0_14px_30px_rgba(255,0,140,0.18)]"
                : "glass-panel text-secondary-foreground border-transparent"
            }`}
          >
            {t("dashboard.allSpaces")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium capitalize transition-all border ${
                activeCategory === cat
                  ? "bg-accent text-accent-foreground border-accent shadow-[0_14px_30px_rgba(255,0,140,0.18)]"
                  : "glass-panel text-secondary-foreground border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid or empty state */}
      {allItems.length === 0 ? (
        <EmptyState onAdd={() => setShowSaveModal(true)} t={t} />
      ) : (
        <>
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} locale={preferredLanguage} t={t} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
            {loadingMore && (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("dashboard.loadingMore")}
              </span>
            )}
          </div>
        </>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal
          onClose={() => {
            setShowSaveModal(false);
            fetchLatest();
          }}
          t={t}
        />
      )}

      {/* Extension auto-save toast */}
      {autoSaveStatus !== "idle" && (
        <div
          className={`glass-panel fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium transition-all border
            ${autoSaveStatus === "saving" ? "text-foreground" : ""}
            ${autoSaveStatus === "saved" ? "border-green-500/40 text-green-600 dark:text-green-400" : ""}
            ${autoSaveStatus === "error" ? "border-destructive/40 text-destructive" : ""}
          `}
        >
          {autoSaveStatus === "saving" && (
            <><Loader2 className="h-4 w-4 animate-spin shrink-0" /> Saving from extension…</>
          )}
          {autoSaveStatus === "saved" && (
            <><CheckCircle2 className="h-4 w-4 shrink-0" /> Saved to YourMind!</>
          )}
          {autoSaveStatus === "error" && (
            <><AlertCircle className="h-4 w-4 shrink-0" /> Failed to save. Try again.</>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  FormEvent,
  startTransition,
} from "react";
import {
  Image as ImageIcon,
  StickyNote,
  FileAudio,
  File,
  Plus,
  X,
  Loader2,
  Link as LinkIcon,
  Search as SearchIcon,
  Music,
  AlertCircle,
  CheckCircle2,
  Play,
  Pencil,
  Quote,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import type en from "../../locales/en.json";

type Messages = typeof en;

interface Item {
  id: string;
  content_type: string;
  card_type?: string | null;
  card_metadata?: Record<string, unknown> | null;
  original_title: string | null;
  translated_title: string | null;
  original_summary: string | null;
  translated_summary: string | null;
  original_content?: string | null;
  original_language: string | null;
  translated_language: string | null;
  auto_tags: string[];
  thumbnail_url: string | null;
  source_url: string | null;
  content_category: string | null;
  chroma_id: string | null;
  created_at: string;
}

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

function getRelativeDate(dateString: string): string {
  const diffMs = new Date(dateString).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, "day");
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, "hour");
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  return rtf.format(diffMinutes, "minute");
}

function getSourceDomain(item: Item) {
  const metadataDomain = typeof item.card_metadata?.domain === "string" ? item.card_metadata.domain : null;
  if (metadataDomain) return metadataDomain;
  if (!item.source_url) return null;
  try {
    return new URL(item.source_url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function getFavicon(item: Item) {
  const metadataFavicon =
    typeof item.card_metadata?.faviconUrl === "string" ? item.card_metadata.faviconUrl : null;
  if (metadataFavicon) return metadataFavicon;
  const domain = getSourceDomain(item);
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    : null;
}

function getStringMeta(item: Item, key: string) {
  const value = item.card_metadata?.[key];
  return typeof value === "string" ? value : null;
}

function getNumberMeta(item: Item, key: string) {
  const value = item.card_metadata?.[key];
  return typeof value === "number" ? value : null;
}

function getStringArrayMeta(item: Item, key: string) {
  const value = item.card_metadata?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function CardHoverDetails({
  item,
}: {
  item: Item;
}) {
  const sourceDomain = getSourceDomain(item);
  const favicon = getFavicon(item);
  const translationPill =
    item.original_language && item.translated_language && item.original_language !== item.translated_language
      ? `${item.original_language.toUpperCase()} → ${item.translated_language.toUpperCase()}`
      : null;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col rounded-[1rem] bg-[rgba(8,8,11,0.84)] p-3 text-white opacity-0 shadow-[0_20px_40px_rgba(8,8,11,0.22)] backdrop-blur-md transition-opacity duration-200 ease-out group-hover:opacity-100">
      <div className="flex items-center justify-end gap-2">
        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto rounded-full bg-white/14 p-2 text-white/90 hover:bg-white/22"
            onClick={(e) => e.stopPropagation()}
            aria-label="Open original"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {item.source_url ? (
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-white/14 p-2 text-white/90 hover:bg-white/22"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startTransition(() => {
                navigator.clipboard.writeText(item.source_url || "");
              });
            }}
            aria-label="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {item.auto_tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/88">
              {tag}
            </span>
          ))}
          {translationPill ? (
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/88">
              {translationPill}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/64">
          <span className="flex items-center gap-2">
            {favicon ? <img src={favicon} alt="" className="h-3.5 w-3.5 rounded-full" /> : null}
            {sourceDomain || "YourMind"}
          </span>
          <span>{getRelativeDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function DefaultTextMeta({
  title,
  summary,
  className,
}: {
  title: string;
  summary?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 px-4 pb-4 pt-3", className)}>
      <h3 className="line-clamp-2 font-display text-[1.1rem] font-semibold leading-tight tracking-[-0.04em] text-foreground">
        {title}
      </h3>
      {summary ? (
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {summary}
        </p>
      ) : null}
    </div>
  );
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
      <GlowCard className="w-full max-w-xl" interactive={false}>
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
  const processing = isProcessing(item);
  const failed = isFailed(item);
  const cardType = item.card_type || item.content_type;
  const title =
    item.translated_title || item.original_title || t("common.untitled");
  const summary = item.translated_summary || item.original_summary;
  const sourceHostname = getSourceDomain(item);
  const imageUrl = item.thumbnail_url || getStringMeta(item, "imageUrl");
  const price = getStringMeta(item, "price");
  const duration = getStringMeta(item, "duration");
  const servings = getStringMeta(item, "servings");
  const cookTime = getStringMeta(item, "cookTime");
  const author = getStringMeta(item, "author");
  const channel = getStringMeta(item, "channel");
  const quoteAttribution = getStringMeta(item, "quoteAttribution");
  const notePreview = getStringMeta(item, "notePreview") || item.original_content || summary;
  const colors = getStringArrayMeta(item, "colors");
  const rating = getNumberMeta(item, "rating");

  // Failed items: non-clickable error card
  if (failed) {
    return (
      <GlowCard
        className="mb-4 block break-inside-avoid"
        innerClassName="p-5 border-destructive/20"
        interactive={false}
      >
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
        "group border-border/70 p-0 transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_16px_32px_rgba(255,0,140,0.08)]",
        processing && "animate-pulse-soft",
        processing && "pointer-events-none"
      )}
      interactive={false}
    >
      <Link href={`/${locale}/items/${item.id}`} className="relative block overflow-hidden rounded-[1.2rem]">
        {processing ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-[1.2rem] bg-muted/60 p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("dashboard.processing")}
            </div>
          </div>
        ) : cardType === "image" && imageUrl ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-card">
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              <CardHoverDetails item={item} />
            </div>
            <DefaultTextMeta title={title} summary={summary} />
          </div>
        ) : cardType === "product" && imageUrl ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-white">
            <div className="relative aspect-[4/5] bg-white">
              <img src={imageUrl} alt="" className="h-full w-full object-contain p-4" loading="lazy" />
              <CardHoverDetails item={item} />
            </div>
            {price ? (
              <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                {price}
              </span>
            ) : null}
            {getFavicon(item) ? (
              <img src={getFavicon(item)!} alt="" className="absolute bottom-3 right-3 h-5 w-5 rounded-full bg-white" />
            ) : null}
            <DefaultTextMeta title={title} summary={summary} />
          </div>
        ) : cardType === "book" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-card shadow-[10px_0_20px_rgba(0,0,0,0.12)]">
            <div className="relative aspect-[2/3] overflow-hidden bg-[linear-gradient(180deg,#22101a,#5f0e3d_60%,#ff008c)] text-white">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full flex-col justify-end p-5">
                  <h3 className="font-display text-2xl font-bold leading-tight">{title}</h3>
                  {author ? <p className="mt-2 text-sm text-white/72">{author}</p> : null}
                </div>
              )}
              <CardHoverDetails item={item} />
            </div>
            <DefaultTextMeta
              title={title}
              summary={author || summary}
              className="pt-4"
            />
            {rating ? <p className="px-4 pb-4 text-xs text-muted-foreground">★ {rating.toFixed(1)}</p> : null}
          </div>
        ) : cardType === "quote" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] border border-indigo-200/60 bg-[rgba(80,70,140,0.05)] p-5">
            <Quote className="mb-3 h-10 w-10 text-indigo-400" />
            <h3 className="mb-3 font-display text-lg font-semibold leading-tight tracking-[-0.04em] text-foreground">
              {title}
            </h3>
            <p className="text-lg leading-8 text-foreground/92">{item.original_content || summary || title}</p>
            {quoteAttribution ? <p className="mt-3 text-sm text-muted-foreground">— {quoteAttribution}</p> : null}
            <CardHoverDetails item={item} />
          </div>
        ) : cardType === "note" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] border-l-[3px] border-l-amber-400 bg-[rgba(251,191,36,0.07)] p-5">
            <Pencil className="absolute right-4 top-4 h-4 w-4 text-amber-600/70" />
            <h3 className="mb-3 pr-6 font-display text-[1.1rem] font-semibold leading-tight tracking-[-0.04em] text-foreground">
              {title}
            </h3>
            <p className="line-clamp-[7] pr-6 text-[14px] leading-7 text-foreground/90">
              {notePreview || title}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,248,237,0.96))]" />
            <CardHoverDetails item={item} />
          </div>
        ) : cardType === "tweet" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-[#121218] p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/12" />
                <div>
                  <p className="text-sm font-semibold">{author || sourceHostname || "Post"}</p>
                  <p className="text-xs text-white/55">@saved</p>
                </div>
              </div>
              <span className="text-xs text-white/45">X</span>
            </div>
            <h3 className="mb-2 font-display text-[1.05rem] font-semibold leading-tight tracking-[-0.03em] text-white">
              {title}
            </h3>
            <p className="line-clamp-5 text-sm leading-7 text-white/88">{summary || title}</p>
            <div className="mt-4 text-xs text-white/45">{getRelativeDate(item.created_at)}</div>
            <CardHoverDetails item={item} />
          </div>
        ) : cardType === "video" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-muted">
            <div className="relative aspect-video">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)]" />
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white">
                  <Play className="ml-0.5 h-5 w-5" />
                </span>
              </span>
              {duration ? (
                <span className="absolute bottom-3 right-3 rounded-md bg-black/72 px-2 py-1 text-[11px] font-semibold text-white">
                  {duration}
                </span>
              ) : null}
              <CardHoverDetails item={item} />
            </div>
            <DefaultTextMeta title={title} summary={summary || channel || sourceHostname || "Video"} />
          </div>
        ) : cardType === "recipe" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-muted">
            <div className="relative aspect-[4/5]">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f8d9c5,#fff6ee)]" />
              )}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                {cookTime ? <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white">⏱ {cookTime}</span> : null}
                {servings ? <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white">👤 {servings}</span> : null}
              </div>
              <CardHoverDetails item={item} />
            </div>
            <DefaultTextMeta title={title} summary={summary} />
          </div>
        ) : cardType === "pdf" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-white">
            <div className="relative aspect-[4/5] bg-[linear-gradient(180deg,#fff,#f5f1f4)] p-5">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <File className="h-14 w-14" />
                </div>
              )}
              <CardHoverDetails item={item} />
            </div>
            <DefaultTextMeta title={title} summary={summary} className="border-t border-border/70 pt-4" />
            {getNumberMeta(item, "pageCount") ? (
              <p className="px-4 pb-4 text-xs text-muted-foreground">📄 {getNumberMeta(item, "pageCount")} pages</p>
            ) : null}
          </div>
        ) : cardType === "audio" ? (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(255,0,140,0.06),rgba(255,255,255,0.84))] p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
                <Music className="h-5 w-5 text-accent" />
              </div>
              {duration ? (
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {duration}
                </span>
              ) : null}
            </div>
            <div className="mb-4 flex h-12 items-end gap-1">
              {[3, 5, 4, 6, 3, 5, 4, 6, 3, 4, 5, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full bg-[linear-gradient(180deg,#5d1a3f,#ff008c)] opacity-80"
                  style={{ height: `${h * 8}px` }}
                />
              ))}
            </div>
            <DefaultTextMeta title={title} summary={summary || channel || sourceHostname || title} className="px-0 pb-0 pt-0" />
            <CardHoverDetails item={item} />
          </div>
        ) : cardType === "color" && colors.length > 0 ? (
          <div className="relative overflow-hidden rounded-[1.2rem]">
            <div className="relative flex min-h-[220px]">
              {colors.map((color) => (
                <div key={color} className="flex-1" style={{ backgroundColor: color }} />
              ))}
              <CardHoverDetails item={item} />
            </div>
            <div className="bg-card">
              <DefaultTextMeta title={title} summary={summary} />
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[1.2rem] bg-card">
            {imageUrl ? (
              <div className="relative aspect-[5/4] overflow-hidden bg-muted">
                <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                <CardHoverDetails item={item} />
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center bg-[linear-gradient(135deg,rgba(255,0,140,0.05),rgba(255,255,255,0.8))] px-6 text-center">
                <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-foreground/78">
                  {sourceHostname || title}
                </p>
              </div>
            )}
            {!imageUrl ? <CardHoverDetails item={item} /> : null}
            <DefaultTextMeta title={title} summary={summary} />
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
    <GlowCard className="mx-auto max-w-2xl" interactive={false}>
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
  const router = useRouter();
  const [allItems, setAllItems] = useState<Item[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= 20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [searchQuery, setSearchQuery] = useState("");
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

  function handleDashboardSearch(e: FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      router.push(`/${preferredLanguage}/search`);
      return;
    }
    router.push(`/${preferredLanguage}/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 lg:hidden">
            <BrandLogo href={`/${preferredLanguage}/dashboard`} size="sm" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.05em]">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {allItems.length === 0
              ? t("dashboard.emptySubtitle")
              : t("dashboard.itemsCount", { count: allItems.length })}
          </p>
        </div>
        <GlowCard className="w-auto" innerClassName="p-2" interactive={false}>
          <button
            onClick={() => setShowSaveModal(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1b0913,#790050_55%,#ff008c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.24)]"
            aria-label={t("nav.saveNew")}
          >
            <Plus className="h-4 w-4" />
            {t("nav.saveNew")}
          </button>
        </GlowCard>
      </div>

      <form onSubmit={handleDashboardSearch} className="mb-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.07))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-white/60 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.44)]">
          <SearchIcon className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/80" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${t("search.title")}...`}
            className="w-full rounded-[inherit] bg-transparent pl-10 pr-4 text-[clamp(1.8rem,3.4vw,3.6rem)] font-display font-medium tracking-[-0.05em] text-foreground placeholder:text-[#b7aab7] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            aria-label={t("search.placeholder")}
          />
        </div>
      </form>

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
            <><Loader2 className="h-4 w-4 animate-spin shrink-0" /> {t("dashboard.extensionSaving")}</>
          )}
          {autoSaveStatus === "saved" && (
            <><CheckCircle2 className="h-4 w-4 shrink-0" /> {t("dashboard.extensionSaved")}</>
          )}
          {autoSaveStatus === "error" && (
            <><AlertCircle className="h-4 w-4 shrink-0" /> {t("dashboard.extensionError")}</>
          )}
        </div>
      )}
    </div>
  );
}

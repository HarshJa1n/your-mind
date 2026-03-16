"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const SUPPORTED = [
  { code: "en", label: "EN", native: "English" },
  { code: "hi", label: "HI", native: "हिन्दी" },
  { code: "es", label: "ES", native: "Español" },
  { code: "fr", label: "FR", native: "Français" },
  { code: "de", label: "DE", native: "Deutsch" },
  { code: "ja", label: "JA", native: "日本語" },
];

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchTo(code: string) {
    setOpen(false);
    // Replace /{currentLang} prefix with /{code}
    const segments = pathname.split("/");
    segments[1] = code;
    router.push(segments.join("/") || `/${code}`);
  }

  const current = SUPPORTED.find((l) => l.code === currentLang) ?? SUPPORTED[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-panel inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4 text-accent" />
        <span>{current.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-muted-foreground", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="glass-panel absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl p-1.5">
          {SUPPORTED.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchTo(lang.code)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm",
                lang.code === currentLang
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-white/70"
              )}
            >
              <span>{lang.native}</span>
              <span
                className={cn(
                  "text-xs",
                  lang.code === currentLang
                    ? "text-accent-foreground/75"
                    : "text-muted-foreground"
                )}
              >
                {lang.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

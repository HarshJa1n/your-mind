"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
        aria-label="Switch language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {SUPPORTED.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchTo(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer
                ${lang.code === currentLang ? "text-accent font-medium bg-accent/5" : "text-foreground"}`}
            >
              <span>{lang.native}</span>
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useDeferredValue } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import {
  LayoutGrid,
  Search,
  Settings,
  Plus,
  LogOut,
  Globe,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import type en from "../../locales/en.json";

const LOCALES = [
  { code: "en", label: "EN", native: "English" },
  { code: "hi", label: "HI", native: "हिन्दी" },
  { code: "es", label: "ES", native: "Español" },
  { code: "fr", label: "FR", native: "Français" },
  { code: "de", label: "DE", native: "Deutsch" },
  { code: "ja", label: "JA", native: "日本語" },
];

type Messages = typeof en;

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
}

export function Sidebar({
  user,
  profile,
  messages,
  lang: langProp,
}: {
  user: User;
  profile: Profile | null;
  messages: Messages;
  lang?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const deferredPathname = useDeferredValue(pathname);
  const lang = langProp || params.lang || "en";
  const supabase = createClient();
  const t = createTranslator(messages);

  // Switch locale: navigate to same path segment but with new lang prefix
  function switchLocale(newLang: string) {
    if (newLang === lang) return;
    const newPath = pathname.replace(/^\/[^/]+/, `/${newLang}`);
    router.push(newPath);
  }

  const NAV_ITEMS = [
    { href: `/${lang}/dashboard`, label: t("nav.dashboard"), icon: LayoutGrid },
    { href: `/${lang}/search`, label: t("nav.search"), icon: Search },
    { href: `/${lang}/settings`, label: t("nav.settings"), icon: Settings },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push(`/${lang}/login`);
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 p-5 lg:block">
      <div className="glass-panel flex h-full flex-col rounded-[2rem] border border-white/60 px-4 py-5">
        <div className="px-3 pb-5">
          <BrandLogo href={`/${lang}/dashboard`} />
        </div>

        <GlowCard className="mb-4" innerClassName="px-3 py-3">
          <Link
            href={`/${lang}/dashboard?new=true`}
            className="flex min-h-12 items-center justify-between rounded-[1.15rem] bg-[linear-gradient(135deg,#1b0913,#77004d_56%,#ff008c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,140,0.22)]"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("nav.saveSomething")}
            </span>
            <Sparkles className="h-4 w-4 opacity-75" />
          </Link>
        </GlowCard>

        <nav className="flex-1 px-1 py-2">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = deferredPathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "glass-panel flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                      isActive
                        ? "border-accent/25 bg-white text-foreground shadow-[0_14px_40px_rgba(255,0,140,0.12)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border",
                        isActive
                          ? "border-accent/15 bg-accent text-accent-foreground"
                          : "border-white/70 bg-white/70"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-1 pb-4">
          <div className="glass-panel rounded-[1.6rem] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-accent" />
              Language
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  title={l.native}
                  className={cn(
                    "min-h-10 rounded-full px-3 py-2 text-xs font-semibold",
                    l.code === lang
                      ? "bg-accent text-accent-foreground shadow-[0_12px_24px_rgba(255,0,140,0.24)]"
                      : "bg-white/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto px-1">
          <div className="glass-panel flex items-center justify-between rounded-[1.6rem] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-sm font-semibold text-white">
                {(profile?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="truncate text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {lang.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-muted-foreground hover:text-foreground"
              aria-label={t("common.signOut")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

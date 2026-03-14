"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import {
  Brain,
  LayoutGrid,
  Search,
  Settings,
  Plus,
  LogOut,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
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
  const lang = langProp || params.lang || "en";
  const supabase = createClient();
  const t = createTranslator(messages);

  // Switch locale: navigate to same path segment but with new lang prefix
  function switchLocale(newLang: string) {
    if (newLang === lang) return;
    // Replace /{lang}/ prefix with /{newLang}/
    const newPath = pathname.replace(/^\/[^/]+/, `/${newLang}`);
    window.location.href = newPath;
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
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6 pb-4">
        <Link href={`/${lang}/dashboard`} className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-accent" />
          <span className="text-lg font-bold tracking-tight">YourMind</span>
        </Link>
      </div>

      <div className="px-4 mb-2">
        <Link
          href={`/${lang}/dashboard?new=true`}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t("nav.saveSomething")}
        </Link>
      </div>

      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Locale switcher */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Language</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              title={l.native}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                l.code === lang
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
              {(profile?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {lang.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-secondary"
            aria-label={t("common.signOut")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

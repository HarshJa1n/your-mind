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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTranslator } from "@/lib/i18n";
import { BrandLogo } from "@/components/brand-logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import type en from "../../locales/en.json";

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

  const NAV_ITEMS = [
    { href: `/${lang}/dashboard`, label: t("nav.dashboard"), icon: LayoutGrid },
    { href: `/${lang}/search`, label: t("nav.search"), icon: Search },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push(`/${lang}/login`);
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-28 shrink-0 p-4 lg:block">
      <div className="glass-panel flex h-full flex-col items-center rounded-[2rem] border border-white/60 px-3 py-4">
        <div className="pb-4">
          <BrandLogo href={`/${lang}/dashboard`} showWordmark={false} size="md" />
        </div>

        <GlowCard className="mb-4 w-full" innerClassName="p-2" interactive={false}>
          <Link
            href={`/${lang}/dashboard?new=true`}
            className="flex min-h-14 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#1b0913,#77004d_56%,#ff008c)] text-white shadow-[0_18px_40px_rgba(255,0,140,0.22)]"
            title={t("nav.saveSomething")}
          >
            <Plus className="h-5 w-5" />
          </Link>
        </GlowCard>

        <nav className="flex-1 py-2">
          <ul className="space-y-3">
            {NAV_ITEMS.map((item) => {
              const isActive = deferredPathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "glass-panel flex h-14 w-14 items-center justify-center rounded-2xl",
                      isActive
                        ? "border-accent/25 bg-white text-foreground shadow-[0_14px_40px_rgba(255,0,140,0.12)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border",
                        isActive
                          ? "border-accent/15 bg-accent text-accent-foreground"
                          : "border-white/70 bg-white/70"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto w-full">
          <div className="flex flex-col items-center gap-3">
            <Link
              href={`/${lang}/settings`}
              title={t("nav.settings")}
              className={cn(
                "glass-panel flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-muted-foreground hover:text-foreground",
                deferredPathname === `/${lang}/settings` &&
                  "border-accent/25 bg-white text-foreground shadow-[0_14px_40px_rgba(255,0,140,0.12)]"
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1b0913,#ff008c)] text-sm font-semibold text-white"
              title={profile?.full_name || user.email || "User"}
            >
              {(profile?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="glass-panel flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-muted-foreground hover:text-foreground"
              aria-label={t("common.signOut")}
              title={t("common.signOut")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import Negotiator from "negotiator";
import { match } from "@formatjs/intl-localematcher";

const LOCALES = ["en", "hi", "es", "fr", "de", "ja"] as const;
const DEFAULT_LOCALE = "en";
const LOCALE_COOKIE = "NEXT_LOCALE";

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }
  try {
    const acceptLang = request.headers.get("accept-language") || "";
    const languages = new Negotiator({
      headers: { "accept-language": acceptLang },
    }).languages();
    return match(languages, [...LOCALES], DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internals, static assets, API routes, and OAuth callback
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/callback") ||
    /\.(.*)$/.test(pathname)
  ) {
    return await updateSession(request);
  }

  // Already has a supported locale prefix — persist to cookie and continue
  const pathnameHasLocale = LOCALES.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const urlLocale = pathname.split("/")[1];
    const response = (await updateSession(request)) ?? NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, urlLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // No locale prefix — detect and redirect
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

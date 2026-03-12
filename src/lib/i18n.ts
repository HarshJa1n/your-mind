/**
 * Lightweight i18n helper.
 * Loads the locale JSON from /locales/<lang>.json
 * Falls back to 'en' for any missing keys.
 */

import en from "../../locales/en.json";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type LocaleMessages = typeof en;

const cache: Record<string, LocaleMessages> = { en };

export async function getMessages(locale: string): Promise<LocaleMessages> {
  if (cache[locale]) return cache[locale];

  try {
    const messages = (await import(`../../locales/${locale}.json`)) as DeepPartial<LocaleMessages>;
    const merged = deepMerge(en, messages) as LocaleMessages;
    cache[locale] = merged;
    return merged;
  } catch {
    return en;
  }
}

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base };
  for (const key in override) {
    const val = override[key as keyof typeof override];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key as keyof T] = deepMerge(
        base[key as keyof T] as object,
        val as object
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key as keyof T] = val as T[keyof T];
    }
  }
  return result;
}

/**
 * Client-side: use pre-loaded messages passed as props.
 * Simple dot-path accessor: t("dashboard.title")
 */
export function createTranslator(messages: LocaleMessages) {
  return function t(path: string, vars?: Record<string, string | number>): string {
    const keys = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = messages;
    for (const k of keys) {
      val = val?.[k];
    }
    if (typeof val !== "string") return path;
    if (vars) {
      return val.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    }
    return val;
  };
}

export type CardType =
  | "article"
  | "image"
  | "note"
  | "quote"
  | "product"
  | "book"
  | "tweet"
  | "video"
  | "recipe"
  | "pdf"
  | "audio"
  | "color";

export interface CardMetadata {
  domain?: string;
  faviconUrl?: string;
  imageUrl?: string | null;
  price?: string | null;
  currency?: string | null;
  unavailable?: boolean;
  author?: string | null;
  source?: string | null;
  duration?: string | null;
  channel?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  rating?: number | null;
  pageCount?: number | null;
  isbn?: string | null;
  colors?: string[];
  quoteAttribution?: string | null;
  notePreview?: string | null;
}

const PRODUCT_DOMAINS = [
  "amazon.",
  "flipkart.",
  "myntra.",
  "asos.",
  "nike.",
  "apple.com",
  "etsy.",
  "shopify.com",
];

const BOOK_DOMAINS = [
  "goodreads.",
  "openlibrary.org",
  "books.google.",
];

const RECIPE_DOMAINS = [
  "allrecipes.",
  "nytcooking.com",
  "bbcgoodfood.",
  "tasty.co",
  "bonappetit.",
  "epicurious.",
];

const VIDEO_DOMAINS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com"];
const TWEET_DOMAINS = ["twitter.com", "x.com"];
const COLOR_DOMAINS = ["coolors.co", "color.adobe.com", "colorhunt.co"];
const IMAGE_HOSTS = ["unsplash.com", "dribbble.com", "behance.net", "imgur.com", "pinterest.com", "instagram.com"];

function matchesDomain(hostname: string, patterns: string[]) {
  return patterns.some((pattern) => hostname.includes(pattern));
}

function tryParseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function getFaviconUrl(url: string): string | null {
  const parsed = tryParseUrl(url);
  if (!parsed) return null;
  return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
}

export function detectDirectFileType(url: string): CardType | null {
  const normalized = url.toLowerCase().split("?")[0];
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/.test(normalized)) return "image";
  if (/\.pdf$/.test(normalized)) return "pdf";
  if (/\.(mp3|wav|m4a|aac|ogg)$/.test(normalized)) return "audio";
  if (/\.(mp4|mov|webm|m4v)$/.test(normalized)) return "video";
  return null;
}

export function extractJsonLdObjects(html: string): unknown[] {
  const matches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  return matches.flatMap((match) => {
    const content = match
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function getSchemaType(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") return [];
  const typeValue = (schema as Record<string, unknown>)["@type"];
  if (typeof typeValue === "string") return [typeValue];
  if (Array.isArray(typeValue)) {
    return typeValue.filter((value): value is string => typeof value === "string");
  }
  return [];
}

function extractPriceFromHtml(html: string) {
  const amountPatterns = [
    /"price"\s*:\s*"([^"]+)"/i,
    /property="product:price:amount"[^>]*content="([^"]+)"/i,
    /itemprop="price"[^>]*content="([^"]+)"/i,
  ];
  const currencyPatterns = [
    /"priceCurrency"\s*:\s*"([^"]+)"/i,
    /property="product:price:currency"[^>]*content="([^"]+)"/i,
    /itemprop="priceCurrency"[^>]*content="([^"]+)"/i,
  ];

  const amount = amountPatterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean) || null;
  const currency = currencyPatterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean) || null;

  return { amount, currency };
}

function normalizeCurrency(amount: string | null, currency: string | null) {
  if (!amount) return null;
  const map: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  const prefix = currency ? map[currency.toUpperCase()] || `${currency.toUpperCase()} ` : "";
  return `${prefix}${amount}`;
}

function parseIsoDuration(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return value;
  const [, h, m, s] = match;
  const hours = Number(h || 0);
  const minutes = Number(m || 0);
  const seconds = Number(s || 0);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${minutes} min`;
  return `${seconds}s`;
}

export function detectColorCardFromText(text: string): string[] {
  return Array.from(new Set(text.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || []));
}

export function detectNoteCardType(title: string, content: string): {
  cardType: CardType;
  metadata: CardMetadata;
} {
  const colors = detectColorCardFromText(`${title} ${content}`);
  if (colors.length > 0 && colors.length <= 8) {
    return { cardType: "color", metadata: { colors } };
  }

  const trimmed = content.trim();
  const quoted =
    trimmed.length > 0 &&
    trimmed.length <= 300 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("“") && trimmed.endsWith("”")));

  if (quoted) {
    return {
      cardType: "quote",
      metadata: {
        quoteAttribution: title || null,
      },
    };
  }

  return {
    cardType: "note",
    metadata: {
      notePreview: trimmed.slice(0, 240),
    },
  };
}

export function detectUrlCardType(
  url: string,
  html: string,
  articleTitle: string,
  imageUrl: string | null
): { cardType: CardType; metadata: CardMetadata } {
  const parsed = tryParseUrl(url);
  const hostname = parsed?.hostname || "";
  const directFileType = detectDirectFileType(url);
  const faviconUrl = getFaviconUrl(url);
  const baseMetadata: CardMetadata = {
    domain: hostname ? hostname.replace(/^www\./, "") : undefined,
    faviconUrl: faviconUrl || undefined,
    imageUrl: imageUrl || undefined,
  };

  if (directFileType) {
    return { cardType: directFileType, metadata: baseMetadata };
  }

  if (matchesDomain(hostname, TWEET_DOMAINS)) {
    return { cardType: "tweet", metadata: baseMetadata };
  }

  if (matchesDomain(hostname, VIDEO_DOMAINS)) {
    const duration =
      html.match(/"duration":"([^"]+)"/i)?.[1] ||
      html.match(/itemprop="duration"[^>]*content="([^"]+)"/i)?.[1] ||
      null;
    const channel =
      html.match(/"author":"([^"]+)"/i)?.[1] ||
      html.match(/name="author"[^>]*content="([^"]+)"/i)?.[1] ||
      null;
    return {
      cardType: "video",
      metadata: {
        ...baseMetadata,
        duration: parseIsoDuration(duration),
        channel,
      },
    };
  }

  if (matchesDomain(hostname, BOOK_DOMAINS)) {
    return {
      cardType: "book",
      metadata: {
        ...baseMetadata,
        author:
          html.match(/name="author"[^>]*content="([^"]+)"/i)?.[1] ||
          html.match(/"author"\s*:\s*"([^"]+)"/i)?.[1] ||
          null,
        isbn:
          html.match(/\b(?:97[89])?\d{10}\b/)?.[0] ||
          null,
      },
    };
  }

  if (matchesDomain(hostname, RECIPE_DOMAINS)) {
    return {
      cardType: "recipe",
      metadata: {
        ...baseMetadata,
      },
    };
  }

  if (matchesDomain(hostname, PRODUCT_DOMAINS)) {
    const { amount, currency } = extractPriceFromHtml(html);
    return {
      cardType: "product",
      metadata: {
        ...baseMetadata,
        price: normalizeCurrency(amount, currency),
        currency,
        unavailable: /out of stock|unavailable/i.test(html),
      },
    };
  }

  if (matchesDomain(hostname, COLOR_DOMAINS)) {
    const colors = parsed?.pathname
      .split("/")
      .flatMap((segment) => segment.split("-"))
      .filter((segment) => /^[0-9a-fA-F]{6}$/.test(segment))
      .map((segment) => `#${segment}`) || [];

    return {
      cardType: "color",
      metadata: {
        ...baseMetadata,
        colors,
      },
    };
  }

  if (matchesDomain(hostname, IMAGE_HOSTS) && imageUrl) {
    return { cardType: "image", metadata: baseMetadata };
  }

  const schemas = extractJsonLdObjects(html);
  for (const schema of schemas) {
    const schemaTypes = getSchemaType(schema).map((value) => value.toLowerCase());
    const schemaRecord = schema as Record<string, unknown>;

    if (schemaTypes.includes("book")) {
      return {
        cardType: "book",
        metadata: {
          ...baseMetadata,
          author:
            typeof schemaRecord.author === "string"
              ? schemaRecord.author
              : ((schemaRecord.author as Record<string, unknown> | undefined)?.name as string | undefined) || null,
        },
      };
    }

    if (schemaTypes.includes("product")) {
      const offers = schemaRecord.offers as Record<string, unknown> | undefined;
      const amount = typeof offers?.price === "string" ? offers.price : null;
      const currency = typeof offers?.priceCurrency === "string" ? offers.priceCurrency : null;
      return {
        cardType: "product",
        metadata: {
          ...baseMetadata,
          price: normalizeCurrency(amount, currency),
          currency,
          unavailable:
            typeof offers?.availability === "string" &&
            /outofstock/i.test(offers.availability),
        },
      };
    }

    if (schemaTypes.includes("recipe")) {
      return {
        cardType: "recipe",
        metadata: {
          ...baseMetadata,
          cookTime: parseIsoDuration(schemaRecord.cookTime as string | undefined),
          servings:
            typeof schemaRecord.recipeYield === "string"
              ? schemaRecord.recipeYield
              : Array.isArray(schemaRecord.recipeYield)
                ? String(schemaRecord.recipeYield[0] || "")
                : null,
        },
      };
    }
  }

  if (
    articleTitle.length < 300 &&
    /^[“"][\s\S]+[”"]$/.test(articleTitle.trim())
  ) {
    return { cardType: "quote", metadata: baseMetadata };
  }

  return { cardType: "article", metadata: baseMetadata };
}

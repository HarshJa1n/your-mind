import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies ────────────────────────────────────────
vi.mock("@/lib/gemini", () => ({
  extractArticleMetadata: vi.fn(),
  extractArticleContent: vi.fn(),
  fetchUrlHtml: vi.fn(),
  processWithGemini: vi.fn(),
  processImageWithGemini: vi.fn(),
  processAudioWithGemini: vi.fn(),
  processUrlWithGeminiContext: vi.fn(),
  resolveBestArticleImage: vi.fn(),
}));

vi.mock("@/lib/lingo", () => ({
  translateMeta: vi.fn(),
  translateTags: vi.fn(),
  translateContent: vi.fn(),
}));

vi.mock("@/lib/chroma", () => ({
  getUserCollection: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid-1234"),
}));

import { createClient } from "@/lib/supabase/server";
import {
  extractArticleContent,
  processUrlWithGeminiContext,
  processWithGemini,
  resolveBestArticleImage,
} from "@/lib/gemini";
import { translateMeta, translateTags } from "@/lib/lingo";
import { getUserCollection } from "@/lib/chroma";
import { saveURLPipeline } from "@/lib/pipeline";

const mockedCreateClient = vi.mocked(createClient);
const mockedExtract = vi.mocked(extractArticleContent);
const mockedProcessUrlWithContext = vi.mocked(processUrlWithGeminiContext);
const mockedProcessGemini = vi.mocked(processWithGemini);
const mockedResolveBestArticleImage = vi.mocked(resolveBestArticleImage);
const mockedTranslateMeta = vi.mocked(translateMeta);
const mockedTranslateTags = vi.mocked(translateTags);
const mockedGetCollection = vi.mocked(getUserCollection);

function makeSupabaseMock({ insertError = null as string | null } = {}) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue({ error: null });

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        error: insertError ? { message: insertError } : null,
      }),
      update: vi.fn().mockReturnValue(chain),
    }),
  };
}

function makeCollectionMock() {
  return {
    add: vi.fn().mockResolvedValue({}),
  };
}

describe("saveURLPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mocks
    mockedExtract.mockResolvedValue({
      title: "Test Article",
      content: "Article body content here.",
      description: "Short description",
      image: "https://example.com/image.jpg",
    });

    mockedProcessUrlWithContext.mockResolvedValue({
      title: "Test Article",
      summary: "A test summary",
      tags: ["tech", "ai"],
      category: "technology",
      detectedLanguage: "en",
      description: "Short description",
      content: "Article body content here.",
      image: "https://example.com/image.jpg",
      retrievedUrls: [
        {
          retrievedUrl: "https://example.com/article",
          urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS",
        },
      ],
    });

    mockedProcessGemini.mockResolvedValue({
      title: "Test Article",
      summary: "A test summary",
      tags: ["tech", "ai"],
      category: "technology",
      detectedLanguage: "en",
    });

    mockedResolveBestArticleImage.mockResolvedValue("https://example.com/image.jpg");

    mockedTranslateMeta.mockResolvedValue({
      title: "परीक्षण लेख",
      summary: "एक परीक्षण सारांश",
    });

    mockedTranslateTags.mockResolvedValue(["तकनीक", "एआई"]);

    mockedGetCollection.mockResolvedValue(makeCollectionMock() as never);
  });

  it("returns success with itemId on valid URL", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const result = await saveURLPipeline({
      url: "https://example.com/article",
      userId: "user-123",
      preferredLanguage: "hi",
    });

    expect(result.success).toBe(true);
    expect(result.itemId).toBe("mock-uuid-1234");
    expect(result.error).toBeUndefined();
  });

  it("returns failure when Supabase insert fails", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ insertError: "DB write failed" }) as never
    );

    const result = await saveURLPipeline({
      url: "https://example.com/article",
      userId: "user-123",
      preferredLanguage: "en",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB write failed");
    expect(result.itemId).toBe("mock-uuid-1234");
  });

  it("inserts placeholder row with correct content_type and source_url", async () => {
    const mock = makeSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    await saveURLPipeline({
      url: "https://news.ycombinator.com/item?id=123",
      userId: "user-abc",
      preferredLanguage: "en",
    });

    const fromResult = mock.from.mock.results[0].value;
    expect(fromResult.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: "article",
        source_url: "https://news.ycombinator.com/item?id=123",
        user_id: "user-abc",
      })
    );
  });

  it("returns success immediately (optimistic) before background completes", async () => {
    // Background processing is async — pipeline should return before it finishes
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    // Make background tasks slow
    mockedExtract.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        title: "Slow",
        content: "Content",
        description: "Desc",
        image: null,
      }), 500))
    );

    const start = Date.now();
    const result = await saveURLPipeline({
      url: "https://example.com/slow",
      userId: "user-123",
      preferredLanguage: "en",
    });
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    // Should return quickly (well under 500ms background delay)
    expect(elapsed).toBeLessThan(400);
  });

  it("falls back to local extraction when URL Context is unavailable", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    mockedProcessUrlWithContext.mockResolvedValue(null);

    await saveURLPipeline({
      url: "https://example.com/fallback",
      userId: "user-123",
      preferredLanguage: "en",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedExtract).toHaveBeenCalledWith("https://example.com/fallback");
    expect(mockedProcessGemini).toHaveBeenCalled();
  });
});

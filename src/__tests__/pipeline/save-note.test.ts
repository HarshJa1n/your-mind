import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies ────────────────────────────────────────
vi.mock("@/lib/gemini", () => ({
  extractArticleContent: vi.fn(),
  processWithGemini: vi.fn(),
  processImageWithGemini: vi.fn(),
  processAudioWithGemini: vi.fn(),
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
  v4: vi.fn().mockReturnValue("note-uuid-5678"),
}));

import { createClient } from "@/lib/supabase/server";
import { processWithGemini } from "@/lib/gemini";
import { translateMeta, translateTags } from "@/lib/lingo";
import { getUserCollection } from "@/lib/chroma";
import { saveNotePipeline } from "@/lib/pipeline";

const mockedCreateClient = vi.mocked(createClient);
const mockedProcessGemini = vi.mocked(processWithGemini);
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

describe("saveNotePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedProcessGemini.mockResolvedValue({
      title: "My Note",
      summary: "Note summary",
      tags: ["personal", "ideas"],
      category: "notes",
      detectedLanguage: "en",
    });

    mockedTranslateMeta.mockResolvedValue({
      title: "मेरी नोट",
      summary: "नोट सारांश",
    });

    mockedTranslateTags.mockResolvedValue(["व्यक्तिगत", "विचार"]);

    mockedGetCollection.mockResolvedValue({
      add: vi.fn().mockResolvedValue({}),
    } as never);
  });

  it("returns success with itemId on valid note", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const result = await saveNotePipeline({
      title: "My Note",
      content: "This is the note content.",
      userId: "user-123",
      preferredLanguage: "en",
    });

    expect(result.success).toBe(true);
    expect(result.itemId).toBe("note-uuid-5678");
    expect(result.error).toBeUndefined();
  });

  it("returns failure when insert fails", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ insertError: "unique constraint violated" }) as never
    );

    const result = await saveNotePipeline({
      title: "Bad Note",
      content: "Content",
      userId: "user-123",
      preferredLanguage: "en",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("unique constraint violated");
  });

  it("inserts note with content_type:note and correct fields", async () => {
    const mock = makeSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    await saveNotePipeline({
      title: "Test Note Title",
      content: "Test note body",
      userId: "user-abc",
      preferredLanguage: "hi",
    });

    const insertCall = mock.from.mock.results[0].value.insert.mock.calls[0][0];
    expect(insertCall).toMatchObject({
      content_type: "note",
      original_title: "Test Note Title",
      original_content: "Test note body",
      user_id: "user-abc",
      translated_language: "hi",
    });
  });

  it("truncates long content for initial summary (200 chars)", async () => {
    const mock = makeSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    const longContent = "A".repeat(500);
    await saveNotePipeline({
      title: "Long Note",
      content: longContent,
      userId: "user-123",
      preferredLanguage: "en",
    });

    const insertCall = mock.from.mock.results[0].value.insert.mock.calls[0][0];
    expect(insertCall.original_summary).toHaveLength(200);
    expect(insertCall.original_summary).toBe("A".repeat(200));
  });

  it("stores empty tags array in initial insert", async () => {
    const mock = makeSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    await saveNotePipeline({
      title: "Note",
      content: "Content",
      userId: "user-123",
      preferredLanguage: "en",
    });

    const insertCall = mock.from.mock.results[0].value.insert.mock.calls[0][0];
    expect(insertCall.auto_tags).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase ──────────────────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// ── Mock Lingo ─────────────────────────────────────────────────────────────
vi.mock("@/lib/lingo", () => ({
  detectLocale: vi.fn().mockResolvedValue("en"),
  translateContent: vi.fn().mockResolvedValue("Translated content here"),
}));

import { createClient } from "@/lib/supabase/server";
import { detectLocale, translateContent } from "@/lib/lingo";
import { POST } from "@/app/api/items/[id]/translate/route";

const mockedCreateClient = vi.mocked(createClient);
const mockedDetectLocale = vi.mocked(detectLocale);
const mockedTranslate = vi.mocked(translateContent);

// ── Mock factory ───────────────────────────────────────────────────────────
function makeSupabaseMock({
  user = { id: "user-123" },
  cached = null as { translated_content: string } | null,
  item = null as { original_content: string; original_language: string; user_id: string } | null,
  itemError = null as Error | null,
} = {}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockImplementation(() => {
    // First .single() call = cache check, second = item fetch
    const callCount = (chain.single as ReturnType<typeof vi.fn>).mock.calls.length;
    if (callCount === 1) {
      return { data: cached, error: cached ? null : { message: "No rows" } };
    }
    return { data: item, error: itemError };
  });
  chain.upsert = vi.fn().mockResolvedValue({ error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue(chain),
  };
}

function makeRequest(
  id: string,
  body: Record<string, unknown>,
  params: Record<string, string> = {}
) {
  return {
    req: new Request(`http://localhost/api/items/${id}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    routeParams: Promise.resolve({ id, ...params }),
  };
}

describe("POST /api/items/:id/translate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const { req, routeParams } = makeRequest("item-1", { targetLocale: "hi" });
    const res = await POST(req as never, { params: routeParams });
    expect(res.status).toBe(401);
  });

  it("returns 400 when targetLocale is missing", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock() as never
    );
    const { req, routeParams } = makeRequest("item-1", {});
    const res = await POST(req as never, { params: routeParams });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/targetLocale/i);
  });

  it("returns cached translation immediately without calling translate", async () => {
    const mock = makeSupabaseMock({
      cached: { translated_content: "Cached translation" },
    });
    mockedCreateClient.mockResolvedValue(mock as never);

    const { req, routeParams } = makeRequest("item-1", { targetLocale: "hi" });
    const res = await POST(req as never, { params: routeParams });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("Cached translation");
    expect(body.cached).toBe(true);
    expect(mockedTranslate).not.toHaveBeenCalled();
  });

  it("translates, stores in cache, and returns content when not cached", async () => {
    const mock = makeSupabaseMock({
      cached: null,
      item: {
        original_content: "Hello world",
        original_language: "en",
        user_id: "user-123",
      },
    });
    mockedCreateClient.mockResolvedValue(mock as never);
    mockedTranslate.mockResolvedValueOnce("नमस्ते दुनिया");

    const { req, routeParams } = makeRequest("item-1", { targetLocale: "hi" });
    const res = await POST(req as never, { params: routeParams });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("नमस्ते दुनिया");
    expect(body.cached).toBe(false);
    expect(mockedTranslate).toHaveBeenCalledWith("Hello world", "en", "hi");

    // Verify cache upsert was called
    const chain = mock.from.mock.results[mock.from.mock.results.length - 1].value;
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: "item-1",
        target_language: "hi",
        translated_content: "नमस्ते दुनिया",
      })
    );
  });

  it("returns 404 when item not found", async () => {
    const mock = makeSupabaseMock({
      cached: null,
      item: null,
      itemError: new Error("Not found"),
    });
    mockedCreateClient.mockResolvedValue(mock as never);

    const { req, routeParams } = makeRequest("nonexistent", { targetLocale: "hi" });
    const res = await POST(req as never, { params: routeParams });
    expect(res.status).toBe(404);
  });

  it("detects source locale when original_language is missing", async () => {
    const mock = makeSupabaseMock({
      cached: null,
      item: {
        original_content: "Hola mundo",
        original_language: null as unknown as string,
        user_id: "user-123",
      },
    });
    mockedCreateClient.mockResolvedValue(mock as never);
    mockedDetectLocale.mockResolvedValueOnce("es");
    mockedTranslate.mockResolvedValueOnce("Hello world");

    const { req, routeParams } = makeRequest("item-1", { targetLocale: "en" });
    const res = await POST(req as never, { params: routeParams });

    expect(res.status).toBe(200);
    expect(mockedDetectLocale).toHaveBeenCalledWith("Hola mundo");
    expect(mockedTranslate).toHaveBeenCalledWith("Hola mundo", "es", "en");
  });
});

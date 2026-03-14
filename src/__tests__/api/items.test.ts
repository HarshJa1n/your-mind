import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared Supabase mock factory ───────────────────────────────────────────
function makeSupabaseMock({
  user = { id: "user-123" },
  profile = { preferred_language: "en" },
  items = [] as unknown[],
  itemCount = 0,
  insertError = null as string | null,
} = {}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue({ data: items, error: null });
  chain.range = vi.fn().mockReturnValue({ data: items, error: null, count: itemCount });
  chain.single = vi.fn().mockReturnValue({ data: profile, error: null });
  chain.insert = vi.fn().mockReturnValue({ error: insertError ? { message: insertError } : null });
  chain.in = vi.fn().mockReturnValue({ data: items, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue(chain),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.supabase.co/uploads/img.jpg" } }),
      }),
    },
  };
}

// ── Mock pipeline ──────────────────────────────────────────────────────────
vi.mock("@/lib/pipeline", () => ({
  saveURLPipeline: vi.fn().mockResolvedValue({ itemId: "item-url-123", success: true }),
  saveNotePipeline: vi.fn().mockResolvedValue({ itemId: "item-note-456", success: true }),
  saveImagePipeline: vi.fn().mockResolvedValue({ itemId: "item-img-789", success: true }),
  saveAudioPipeline: vi.fn().mockResolvedValue({ itemId: "item-aud-101", success: true }),
}));

// ── Mock Supabase server ───────────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { saveURLPipeline, saveNotePipeline } from "@/lib/pipeline";
import { GET, POST } from "@/app/api/items/route";

const mockedCreateClient = vi.mocked(createClient);

// ── GET /api/items ─────────────────────────────────────────────────────────
describe("GET /api/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when user is not authenticated", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const req = new Request("http://localhost/api/items");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns paginated items for authenticated user", async () => {
    const fakeItems = [{ id: "a1" }, { id: "a2" }];
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ items: fakeItems, itemCount: 2 }) as never
    );

    const req = new Request("http://localhost/api/items?offset=0&limit=20");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual(fakeItems);
    expect(typeof body.hasMore).toBe("boolean");
    expect(typeof body.total).toBe("number");
  });

  it("defaults to limit=20 when no params given", async () => {
    const mock = makeSupabaseMock({ items: [], itemCount: 0 });
    mockedCreateClient.mockResolvedValue(mock as never);

    const req = new Request("http://localhost/api/items");
    const res = await GET(req);
    expect(res.status).toBe(200);
    // Check range was called (pagination applied)
    const chain = mock.from.mock.results[0].value;
    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });

  it("caps limit at 50", async () => {
    const mock = makeSupabaseMock({ items: [], itemCount: 0 });
    mockedCreateClient.mockResolvedValue(mock as never);

    const req = new Request("http://localhost/api/items?offset=0&limit=100");
    await GET(req);
    const chain = mock.from.mock.results[0].value;
    expect(chain.range).toHaveBeenCalledWith(0, 49); // capped at 50
  });

  it("hasMore is true when more items exist", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ items: Array(20).fill({ id: "x" }), itemCount: 50 }) as never
    );
    const req = new Request("http://localhost/api/items?offset=0&limit=20");
    const res = await GET(req);
    const body = await res.json();
    expect(body.hasMore).toBe(true);
  });

  it("hasMore is false when all items are loaded", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ items: [{ id: "x" }], itemCount: 1 }) as never
    );
    const req = new Request("http://localhost/api/items?offset=0&limit=20");
    const res = await GET(req);
    const body = await res.json();
    expect(body.hasMore).toBe(false);
  });
});

// ── POST /api/items — JSON ─────────────────────────────────────────────────
describe("POST /api/items (JSON)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("saves a URL and returns itemId + processing:true", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://example.com/article" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.itemId).toBe("item-url-123");
    expect(body.processing).toBe(true);
    expect(saveURLPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com/article" })
    );
  });

  it("saves a note and returns itemId + processing:true", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", title: "My Note", content: "Some content here" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.itemId).toBe("item-note-456");
    expect(saveNotePipeline).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Note", content: "Some content here" })
    );
  });

  it("returns 400 when URL is missing for type:url", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url" }), // no url field
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url/i);
  });

  it("returns 400 when title or content is missing for type:note", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", title: "Only title" }), // missing content
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown type", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "unknown" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("passes preferredLanguage from user profile to pipeline", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ profile: { preferred_language: "hi" } }) as never
    );
    vi.mocked(saveURLPipeline).mockResolvedValueOnce({ itemId: "x", success: true });

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://example.com" }),
    });
    await POST(req);
    expect(saveURLPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ preferredLanguage: "hi" })
    );
  });

  it("returns 500 when pipeline fails", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(saveURLPipeline).mockResolvedValueOnce({
      itemId: "x",
      success: false,
      error: "DB write failed",
    });

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

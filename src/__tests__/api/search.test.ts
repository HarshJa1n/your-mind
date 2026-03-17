import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock pipeline ──────────────────────────────────────────────────────────
vi.mock("@/lib/pipeline", () => ({
  semanticSearch: vi.fn(),
}));

// ── Mock Supabase ──────────────────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { semanticSearch } from "@/lib/pipeline";
import { POST } from "@/app/api/search/route";

const mockedCreateClient = vi.mocked(createClient);
const mockedSemanticSearch = vi.mocked(semanticSearch);

function makeSupabaseMock({
  user = { id: "user-123" },
  textResults = [] as unknown[],
} = {}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue({ data: textResults, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue(chain),
  };
}

describe("POST /api/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when query is empty", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "   " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/query/i);
  });

  it("returns 400 when query is missing", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns semantic search results on success", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    const fakeResults = [
      { id: "item-1", original_title: "Article 1", similarity: 0.95 },
      { id: "item-2", original_title: "Article 2", similarity: 0.88 },
    ];
    mockedSemanticSearch.mockResolvedValueOnce(fakeResults as never);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "machine learning" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual(fakeResults);
    expect(mockedSemanticSearch).toHaveBeenCalledWith("machine learning", "user-123", 20);
  });

  it("trims whitespace from query before searching", async () => {
    mockedCreateClient.mockResolvedValue(makeSupabaseMock() as never);
    mockedSemanticSearch.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "  neural networks  " }),
    });
    await POST(req);
    expect(mockedSemanticSearch).toHaveBeenCalledWith("neural networks", "user-123", 20);
  });

  it("falls back to text search when semanticSearch throws", async () => {
    const textResults = [{ id: "item-3", original_title: "Fallback item" }];
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ textResults }) as never
    );
    mockedSemanticSearch.mockRejectedValueOnce(new Error("Chroma unavailable"));

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "fallback query" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Falls back to text search results with similarity=0.7
    expect(body.results).toEqual([{ ...textResults[0], similarity: 0.7 }]);
  });

  it("falls back to text search when semanticSearch returns no matches", async () => {
    const textResults = [{ id: "item-4", original_title: "Translated fallback item" }];
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ textResults }) as never
    );
    mockedSemanticSearch.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "सीखने का तरीका" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([{ ...textResults[0], similarity: 0.7 }]);
  });

  it("returns empty results array on fallback when no text matches", async () => {
    mockedCreateClient.mockResolvedValue(
      makeSupabaseMock({ textResults: [] }) as never
    );
    mockedSemanticSearch.mockRejectedValueOnce(new Error("Chroma down"));

    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "no results" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
  });
});

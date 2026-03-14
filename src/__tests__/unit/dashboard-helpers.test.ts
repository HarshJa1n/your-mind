import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Replicate the helpers here to test them in isolation
// (They're defined inside the component file, so we test the logic directly)

const PROCESSING_TIMEOUT_MS = 3 * 60 * 1000;

type Item = {
  chroma_id: string | null;
  original_summary: string | null;
  created_at: string;
};

function isProcessing(item: Item): boolean {
  if (item.chroma_id || item.original_summary) return false;
  const age = Date.now() - new Date(item.created_at).getTime();
  return age < PROCESSING_TIMEOUT_MS;
}

function isFailed(item: Item): boolean {
  if (item.chroma_id || item.original_summary) return false;
  const age = Date.now() - new Date(item.created_at).getTime();
  return age >= PROCESSING_TIMEOUT_MS;
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    chroma_id: null,
    original_summary: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("isProcessing", () => {
  it("returns true for a brand-new item with no chroma_id or summary", () => {
    expect(isProcessing(makeItem())).toBe(true);
  });

  it("returns false when chroma_id is set (item is done)", () => {
    expect(isProcessing(makeItem({ chroma_id: "some-uuid" }))).toBe(false);
  });

  it("returns false when original_summary is set (item is done)", () => {
    expect(isProcessing(makeItem({ original_summary: "A summary" }))).toBe(false);
  });

  it("returns false for item older than 3 minutes (timed out)", () => {
    const oldDate = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(isProcessing(makeItem({ created_at: oldDate }))).toBe(false);
  });

  it("returns true for item exactly 1 minute old", () => {
    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    expect(isProcessing(makeItem({ created_at: recent }))).toBe(true);
  });
});

describe("isFailed", () => {
  it("returns false for a brand-new item (still processing)", () => {
    expect(isFailed(makeItem())).toBe(false);
  });

  it("returns false when item completed successfully", () => {
    const oldDate = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(
      isFailed(makeItem({ chroma_id: "uuid", created_at: oldDate }))
    ).toBe(false);
  });

  it("returns true for item older than 3 minutes with no chroma_id or summary", () => {
    const oldDate = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(isFailed(makeItem({ created_at: oldDate }))).toBe(true);
  });

  it("isFailed and isProcessing are mutually exclusive for any item", () => {
    const cases = [
      makeItem(),
      makeItem({ chroma_id: "uuid" }),
      makeItem({ original_summary: "done" }),
      makeItem({ created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() }),
    ];
    for (const item of cases) {
      expect(isProcessing(item) && isFailed(item)).toBe(false);
    }
  });
});

import { describe, it, expect } from "vitest";
import { createTranslator } from "@/lib/i18n";
import en from "../../../locales/en.json";

describe("createTranslator", () => {
  const t = createTranslator(en);

  it("returns the correct string for a known key", () => {
    expect(t("nav.dashboard")).toBe("Dashboard");
    expect(t("common.close")).toBe("Close");
    expect(t("saveModal.saving")).toBe("Saving...");
  });

  it("returns nested keys correctly", () => {
    expect(t("dashboard.title")).toBe("Your Mind");
    expect(t("auth.signIn")).toBe("Sign in");
  });

  it("interpolates variables", () => {
    expect(t("dashboard.itemsCount", { count: 5 })).toBe("5 items saved");
    expect(t("search.noResults", { query: "react hooks" })).toBe(
      'No results found for "react hooks"'
    );
  });

  it("returns the key path for unknown keys (graceful fallback)", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
    expect(t("dashboard.doesNotExist")).toBe("dashboard.doesNotExist");
  });

  it("handles missing variable gracefully", () => {
    // Variable not provided — keeps the placeholder
    const result = t("dashboard.itemsCount");
    expect(result).toContain("{count}");
  });

  it("has all required saveModal keys", () => {
    const keys = [
      "saveModal.title",
      "saveModal.urlTab",
      "saveModal.noteTab",
      "saveModal.imageTab",
      "saveModal.audioTab",
      "saveModal.saveArticle",
      "saveModal.saveNote",
      "saveModal.saveImage",
      "saveModal.saveAudio",
      "saveModal.saving",
    ];
    for (const key of keys) {
      const result = t(key);
      expect(result).not.toBe(key); // should resolve, not return the key
    }
  });

  it("has itemDetail translation keys", () => {
    expect(t("itemDetail.viewOriginal")).toBe("View original");
    expect(t("itemDetail.viewTranslated")).toBe("View translated");
  });

  it("has dashboard smart spaces keys", () => {
    expect(t("dashboard.allSpaces")).toBe("All");
    expect(t("dashboard.loadingMore")).toBe("Loading more...");
  });
});

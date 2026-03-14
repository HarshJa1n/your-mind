import { vi } from "vitest";

// Silence console.error in tests (expected errors in some tests)
// Restore if you need to debug
vi.spyOn(console, "error").mockImplementation(() => {});

// Env vars needed by the app
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.CHROMA_API_KEY = "test-chroma-key";
process.env.CHROMA_TENANT = "test-tenant";
process.env.CHROMA_DATABASE = "test-db";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.LINGO_DEV_API_KEY = "test-lingo-key";

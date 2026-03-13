import type { NextConfig } from "next";
import { withLingo } from "@lingo.dev/compiler/next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Allow server components to use Node.js features needed by Chroma/Gemini
  serverExternalPackages: ["chromadb", "@google/generative-ai"],
};

export default withLingo(nextConfig, {
  sourceLocale: "en",
  targetLocales: ["hi", "es", "fr", "de", "ja", "ko", "zh", "ar", "pt", "ru", "it"],
});

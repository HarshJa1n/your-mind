import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Allow server components to use Node.js features needed by Chroma/Gemini
  serverExternalPackages: ["chromadb", "@chroma-core/google-gemini", "@google/generative-ai"],
};

export default nextConfig;

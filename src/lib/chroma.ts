import { ChromaClient } from "chromadb";
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";

let _client: ChromaClient | null = null;
let _embedder: GoogleGeminiEmbeddingFunction | null = null;

export function getChromaClient(): ChromaClient {
  if (!_client) {
    _client = new ChromaClient({
      host: "api.trychroma.com",
      tenant: process.env.CHROMA_TENANT!,
      database: process.env.CHROMA_DATABASE!,
      auth: {
        provider: "token",
        credentials: process.env.CHROMA_API_KEY!,
        tokenHeaderType: "X_CHROMA_TOKEN",
      },
    });
  }
  return _client;
}

export function getEmbedder(): GoogleGeminiEmbeddingFunction {
  if (!_embedder) {
    _embedder = new GoogleGeminiEmbeddingFunction({
      apiKey: process.env.GEMINI_API_KEY!,
      modelName: "gemini-embedding-2-preview",
    });
  }
  return _embedder;
}

/**
 * Get or create the "items" Chroma collection for a user.
 * Collection name: `items-{userId}` to namespace per user.
 */
export async function getUserCollection(userId: string) {
  const client = getChromaClient();
  const embedder = getEmbedder();
  const collectionName = `items-${userId.replace(/-/g, "")}`;

  try {
    return await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embedder,
      metadata: { userId },
    });
  } catch {
    return await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: embedder,
      metadata: { userId },
    });
  }
}

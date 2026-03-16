import { ChromaClient, type EmbeddingFunction } from "chromadb";
import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: ChromaClient | null = null;
let _embedder: GeminiEmbeddingFunction | null = null;

/**
 * Custom embedding function using @google/generative-ai directly.
 * Avoids the @chroma-core/google-gemini module format issues.
 */
class GeminiEmbeddingFunction implements EmbeddingFunction {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = "gemini-embedding-2-preview") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private getModel() {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }

  async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const model = this.getModel();

    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }

    return embeddings;
  }

  async generateText(text: string): Promise<number[]> {
    const model = this.getModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async generateMedia(buffer: Buffer, mimeType: string): Promise<number[]> {
    const model = this.getModel();
    const result = await model.embedContent([
      {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      },
    ] as Parameters<typeof model.embedContent>[0]);

    return result.embedding.values;
  }
}

export function getChromaClient(): ChromaClient {
  if (!_client) {
    _client = new ChromaClient({
      host: "api.trychroma.com",
      ssl: true,
      tenant: process.env.CHROMA_TENANT!,
      database: process.env.CHROMA_DATABASE!,
      headers: {
        "X-Chroma-Token": process.env.CHROMA_API_KEY!,
      },
    });
  }
  return _client;
}

export function getEmbedder(): GeminiEmbeddingFunction {
  if (!_embedder) {
    _embedder = new GeminiEmbeddingFunction(process.env.GEMINI_API_KEY!);
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

  return await client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: embedder,
    metadata: { userId },
  });
}

import { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * EMBEDDINGS_PROVIDER=openai (default) | huggingface | huggingface-local
 *
 *   openai              - text-embedding-3-small via OpenAI. Needs OPENAI_API_KEY.
 *   huggingface         - hosted HF Inference API. Needs HUGGINGFACEHUB_API_KEY
 *                          (free at huggingface.co/settings/tokens). No local compute.
 *   huggingface-local    - runs entirely on your machine via transformers.js (ONNX).
 *                          No API key at all - downloads the model once (~90MB for
 *                          the default) and caches it locally. Slower on first run,
 *                          free forever after, and nothing leaves your machine.
 *
 * This is the one thing that let you drop OpenAI entirely: pair
 * LLM_PROVIDER=groq with EMBEDDINGS_PROVIDER=huggingface-local and the
 * pipeline needs no OpenAI key at all.
 *
 * NOTE: whichever provider you pick, use the SAME one consistently for a
 * given Pinecone index / KB - embeddings from different models are not
 * comparable, so switching providers on an existing index silently breaks
 * retrieval quality. Re-ingest the KB after switching.
 */
type EmbeddingsProvider = "openai" | "huggingface" | "huggingface-local";

function getEmbeddingsProvider(): EmbeddingsProvider {
  const p = (process.env.EMBEDDINGS_PROVIDER || "openai").toLowerCase();
  if (p === "huggingface" || p === "huggingface-local") return p;
  return "openai";
}

let cached: Embeddings | null = null;

export async function getEmbeddings(): Promise<Embeddings> {
  if (cached) return cached;

  const provider = getEmbeddingsProvider();

  if (provider === "huggingface-local") {
    const { HuggingFaceTransformersEmbeddings } = await import(
      "@langchain/community/embeddings/huggingface_transformers"
    );
    cached = new HuggingFaceTransformersEmbeddings({
      model: process.env.HF_LOCAL_MODEL || "Xenova/all-MiniLM-L6-v2", // 384-dim, small & fast
    });
    return cached;
  }

  if (provider === "huggingface") {
    if (!process.env.HUGGINGFACEHUB_API_KEY) {
      throw new Error("HUGGINGFACEHUB_API_KEY is required when EMBEDDINGS_PROVIDER=huggingface.");
    }
    const { HuggingFaceInferenceEmbeddings } = await import("@langchain/community/embeddings/hf");
    cached = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACEHUB_API_KEY,
      model: process.env.HF_MODEL || "sentence-transformers/all-MiniLM-L6-v2", // 384-dim
    });
    return cached;
  }

  cached = new OpenAIEmbeddings({ model: "text-embedding-3-small" }); // 1536-dim
  return cached;
}

export function getEmbeddingsProviderName(): EmbeddingsProvider {
  return getEmbeddingsProvider();
}

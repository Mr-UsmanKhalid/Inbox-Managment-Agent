import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { Runnable } from "@langchain/core/runnables";
import { z } from "zod";

// Central place that decides which LLM backend to use.
//   LLM_PROVIDER=openai (default) | groq
//   MOCK_LLM=true forces the deterministic mock regardless of provider,
//   or mock mode kicks in automatically if no API key is set for the
//   chosen provider - handy for local dev / CI / this sandboxed demo.
type Provider = "openai" | "groq";

function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  return p === "groq" ? "groq" : "openai";
}

function hasKeyForProvider(provider: Provider): boolean {
  return provider === "groq" ? !!process.env.GROQ_API_KEY : !!process.env.OPENAI_API_KEY;
}

const PROVIDER = getProvider();
const USE_MOCK = process.env.MOCK_LLM === "true" || !hasKeyForProvider(PROVIDER);

export function getChatModel(temperature = 0) {
  if (USE_MOCK) {
    throw new Error(
      "getChatModel() called in mock mode - nodes should check isMockMode() first and use mock logic instead."
    );
  }

  if (PROVIDER === "groq") {
    // Groq: fast/cheap inference. Good models for structured output:
    // llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
    return new ChatGroq({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature,
    });
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature,
  });
}

export function isMockMode(): boolean {
  return USE_MOCK;
}

export function getActiveProvider(): Provider {
  return PROVIDER;
}

/**
 * Returns a runnable that invokes the active chat model and parses its
 * output against `schema`. Both ChatOpenAI and ChatGroq implement
 * withStructuredOutput, but TypeScript can't unify their overloaded
 * signatures across the union type returned by getChatModel() - this
 * helper isolates the necessary cast in one place instead of scattering
 * `as any` through every graph node.
 */
export function structuredModel<T extends z.ZodTypeAny>(
  schema: T,
  temperature = 0
): Runnable<BaseLanguageModelInput, z.infer<T>> {
  const model = getChatModel(temperature) as ChatOpenAI;
  return model.withStructuredOutput(schema);
}

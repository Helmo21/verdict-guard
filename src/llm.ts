import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "anthropic" | "openai" | "openrouter";

export interface LLMConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface ResolveOptions {
  anthropicKey?: string;
  openaiKey?: string;
  openrouterKey?: string;
  preferredProvider?: Provider;
  modelOverride?: string;
  maxTokens?: number;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  // Anthropic native
  anthropic: "claude-sonnet-4-6",
  // OpenRouter route to the SAME Claude model — verbatim equivalence with native Anthropic.
  openrouter: "anthropic/claude-sonnet-4.6",
  // OpenAI cannot run Claude — pick a comparable tier for structured output.
  openai: "gpt-5-mini",
};

const DEFAULT_MAX_TOKENS = 800;

/**
 * Picks an LLM provider given a set of available keys.
 *
 * Resolution order when no `preferredProvider` is given:
 *   1. anthropic   (native, lowest latency)
 *   2. openrouter  (same Claude model via gateway)
 *   3. openai      (fallback, comparable model)
 *
 * Returns null if no key is available — caller decides whether that's fatal.
 */
export function resolveLLM(opts: ResolveOptions): LLMConfig | null {
  const { anthropicKey, openaiKey, openrouterKey, preferredProvider, modelOverride, maxTokens } = opts;

  let provider: Provider | null = null;
  let apiKey = "";

  if (preferredProvider) {
    const k =
      preferredProvider === "anthropic" ? anthropicKey :
      preferredProvider === "openai" ? openaiKey :
      openrouterKey;
    if (!k) return null;
    provider = preferredProvider;
    apiKey = k;
  } else if (anthropicKey) {
    provider = "anthropic"; apiKey = anthropicKey;
  } else if (openrouterKey) {
    provider = "openrouter"; apiKey = openrouterKey;
  } else if (openaiKey) {
    provider = "openai"; apiKey = openaiKey;
  }

  if (!provider) return null;

  return {
    provider,
    apiKey,
    model: modelOverride ?? DEFAULT_MODELS[provider],
    maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
  };
}

/**
 * One unified call. Returns the assistant's text response.
 *
 * Anthropic uses the Messages API. OpenAI and OpenRouter share the OpenAI-compatible
 * Chat Completions API — the only difference is the baseURL.
 */
export async function callModel(config: LLMConfig, system: string, user: string): Promise<string> {
  if (config.provider === "anthropic") {
    return callAnthropic(config, system, user);
  }
  return callOpenAICompatible(config, system, user);
}

async function callAnthropic(config: LLMConfig, system: string, user: string): Promise<string> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("");
}

async function callOpenAICompatible(config: LLMConfig, system: string, user: string): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
    defaultHeaders:
      config.provider === "openrouter"
        ? { "HTTP-Referer": "https://github.com/antoine-pedretti/verdict-guard", "X-Title": "verdict-guard" }
        : undefined,
  });
  const response = await client.chat.completions.create({
    model: config.model,
    max_completion_tokens: config.maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

import type OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Loads the OpenAI SDK only when a route handler runs (dynamic import).
 * Avoids `next build` / page-data collection failing when OPENAI_API_KEY is unset.
 */
export async function getOpenAI(): Promise<OpenAI> {
  if (!client) {
    const { default: OpenAIClient } = await import("openai");
    client = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** Non-streaming response from `responses.create` (excludes `Stream` union member). */
export type OpenAiResponsesCreateResult = Extract<
  Awaited<ReturnType<InstanceType<typeof OpenAI>["responses"]["create"]>>,
  { output: unknown }
>;

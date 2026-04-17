import type OpenAI from "openai";

let client: OpenAI | null = null;

/** Satisfies the SDK constructor during edge cases; never used for real calls when routes gate on env first. */
const PLACEHOLDER_API_KEY = "sk-build-placeholder-not-used";

/**
 * Loads the OpenAI SDK only when called (dynamic import). Passes a non-empty
 * `apiKey` when env is missing so the SDK does not throw during `next build`.
 */
export async function getOpenAI(): Promise<OpenAI> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key) {
    if (!client) {
      const { default: OpenAIClient } = await import("openai");
      client = new OpenAIClient({ apiKey: key });
    }
    return client;
  }
  const { default: OpenAIClient } = await import("openai");
  return new OpenAIClient({ apiKey: PLACEHOLDER_API_KEY });
}

/** Non-streaming response from `responses.create` (excludes `Stream` union member). */
export type OpenAiResponsesCreateResult = Extract<
  Awaited<ReturnType<InstanceType<typeof OpenAI>["responses"]["create"]>>,
  { output: unknown }
>;

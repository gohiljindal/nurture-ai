import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** Non-streaming response from `responses.create` (excludes `Stream` union member). */
export type OpenAiResponsesCreateResult = Extract<
  Awaited<ReturnType<InstanceType<typeof OpenAI>["responses"]["create"]>>,
  { output: unknown }
>;

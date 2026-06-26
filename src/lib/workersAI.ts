/**
 * Cloudflare Workers AI — Reusable helper
 * Calls the Workers AI REST API with the given model and input.
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_AI_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || "";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AITextInput = {
  messages: AIMessage[];
  max_tokens?: number;
  temperature?: number;
};

export type AIResponse = {
  result?: {
    response?: string;
  };
  success: boolean;
  errors: Array<{ message: string }>;
};

/**
 * Run an AI model on Cloudflare Workers AI via REST API.
 * @param model - The model identifier, e.g. "@cf/meta/llama-3-8b-instruct"
 * @param input - The input payload for the model
 * @returns The parsed JSON response from Workers AI
 */
export async function runAI(
  model: string,
  input: AITextInput
): Promise<AIResponse> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_AI_TOKEN) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_TOKEN environment variables"
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_AI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Workers AI request failed (${response.status}): ${text}`
    );
  }

  const data: AIResponse = await response.json();

  if (!data.success) {
    const errMsg = data.errors?.map((e) => e.message).join(", ") || "Unknown AI error";
    throw new Error(`Workers AI error: ${errMsg}`);
  }

  return data;
}

import { sendErrorNotification } from "./email";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const USER_FRIENDLY_ERROR = "Сервис временно недоступен. Пожалуйста, попробуйте через 5 минут.";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error instanceof ParseError) {
        console.error(`[${context}] Parse error (not retrying):`, error.message);
        throw new Error("AI вернул некорректный ответ. Пожалуйста, попробуйте ещё раз.");
      }
      lastError = error;
      console.error(`[${context}] Attempt ${attempt}/${RETRY_ATTEMPTS} failed:`, error.message || error);
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  console.error(`[${context}] All ${RETRY_ATTEMPTS} attempts failed.`);
  sendErrorNotification(
    context,
    lastError?.message || "Unknown error",
    `Все ${RETRY_ATTEMPTS} попытки завершились неудачей`
  ).catch(() => {});
  throw new Error(USER_FRIENDLY_ERROR);
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json|javascript|js)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export function extractContent(response: any): string | null {
  if (!response?.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    return null;
  }
  const content = response.choices[0]?.message?.content || null;
  if (!content) return null;
  return stripCodeFences(content);
}

/**
 * Robustly extracts a JSON object or array from AI response text.
 * Handles cases where YandexGPT wraps JSON in extra text or markdown.
 * Falls back gracefully — caller should still handle JSON.parse errors.
 */
export function extractJson(text: string, type: "object" | "array" = "object"): string {
  // Try direct parse first (already stripped by extractContent)
  try {
    JSON.parse(text);
    return text;
  } catch {}

  if (type === "array") {
    // Try to find JSON array
    const first = text.indexOf("[");
    const last = text.lastIndexOf("]");
    if (first !== -1 && last > first) {
      const candidate = text.slice(first, last + 1);
      try { JSON.parse(candidate); return candidate; } catch {}
    }
  }

  // Try to find JSON object
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const candidate = text.slice(first, last + 1);
    try { JSON.parse(candidate); return candidate; } catch {}
  }

  // Try stripping code fences again (in case of nested fences)
  const stripped = stripCodeFences(text);
  if (stripped !== text) {
    return extractJson(stripped, type);
  }

  return text;
}

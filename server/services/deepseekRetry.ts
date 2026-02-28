const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;
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
  throw new Error(USER_FRIENDLY_ERROR);
}

export function extractContent(response: any): string | null {
  if (!response?.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    return null;
  }
  return response.choices[0]?.message?.content || null;
}

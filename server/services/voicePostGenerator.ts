import { withRetry, extractContent } from "./deepseekRetry";
import { getDeepseekClient } from "./deepseekClient";

const SYSTEM_PROMPT = `Ты — копирайтер для эзотерических экспертов (тарологов, астрологов, нумерологов).
Твоя задача — превратить устную речь эксперта в красивый, структурированный пост для социальных сетей.

Правила:
1. Сохрани основную мысль и тон автора
2. Структурируй текст с абзацами для удобного чтения
3. Добавь цепляющий заголовок в начале
4. Используй эмоциональные акценты и вопросы к читателю
5. Добавь призыв к действию или вопрос в конце
6. Добавь 5-7 релевантных хэштегов в конце
7. Текст должен быть готов к публикации без дополнительной редактуры
8. Пиши на русском языке
9. Используй абзацы и списки для структуры
10. Не добавляй эмодзи, если их не было в оригинале

Стиль: тёплый, вдохновляющий, экспертный.`;

export async function generatePostFromTranscript(transcript: string): Promise<string> {
  const client = getDeepseekClient();

  const userPrompt = `Преврати эту устную речь в красивый пост для социальных сетей:

"${transcript}"

Создай готовый к публикации пост:`;

  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = extractContent(response);
    if (!content) {
      throw new Error("Пустой ответ от AI");
    }
    return content;
  }, "VoicePostGenerator");
}

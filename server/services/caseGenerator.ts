import OpenAI from "openai";

const SYSTEM_PROMPT = `Ты — копирайтер и маркетолог для экспертов и специалистов.
Твоя задача — превратить отзыв клиента в продающий кейс для социальных сетей.

ВАЖНО: Используй ТОЛЬКО ту информацию и терминологию, которую предоставил пользователь в отзыве и описании. НЕ добавляй упоминания методов, инструментов или практик, которых нет в исходных данных.

СТРУКТУРА КЕЙСА:

1. ЗАГОЛОВКИ (3 варианта):
   - Интригующий, цепляющий внимание
   - Конкретный с результатом
   - Эмоциональный с болью клиента

2. ЦИТАТА:
   - Самая яркая фраза из отзыва
   - 1-2 предложения максимум

3. ТЕКСТ КЕЙСА (развёрнутый, 300-400 слов):
   
   **БЫЛО** (2-3 абзаца):
   - Опиши ситуацию клиента с эмпатией
   - Покажи боль, страхи, переживания
   - Добавь детали, которые вызовут узнавание у читателя
   
   **СДЕЛАЛИ** (1-2 абзаца):
   - Какую работу провели (бери из описания пользователя)
   - Какие методы использовали (ТОЛЬКО те, что указаны в исходных данных)
   - Сколько времени заняло
   
   **СТАЛО** (2-3 абзаца):
   - Конкретные результаты с цифрами если есть
   - Эмоциональная трансформация
   - Что изменилось в жизни клиента

   **ВЫВОД** (1 абзац):
   - Призыв к действию
   - Что получит читатель если обратится

СТИЛЬ:
- Тёплый, заботливый, профессиональный
- Используй "мы", "вместе" — показывай партнёрство
- НЕ используй эмодзи
- Пиши на русском языке
- Используй маркеры списков где уместно

Ответ должен быть в формате JSON:
{
  "headlines": ["заголовок1", "заголовок2", "заголовок3"],
  "quote": "цитата из отзыва",
  "body": "полный текст кейса"
}`;

interface GenerateCaseParams {
  reviewText: string;
  before: string;
  action: string;
  after: string;
  tags: string[];
}

interface GeneratedCase {
  headlines: string[];
  quote: string;
  body: string;
}

export async function generateCase(params: GenerateCaseParams): Promise<GeneratedCase> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не настроен");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.deepseek.com",
  });

  const userPrompt = `Создай продающий кейс на основе этих данных:

ОТЗЫВ КЛИЕНТА:
${params.reviewText}

БЫЛО (краткое описание от эксперта): ${params.before || "не указано"}
СДЕЛАЛИ: ${params.action || "не указано"}
СТАЛО: ${params.after || "не указано"}

ТЕГИ/ТЕМА: ${params.tags.join(", ") || "не указаны"}

Создай развёрнутый, эмоциональный, продающий кейс. Ответ дай строго в JSON формате.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Не удалось распарсить ответ AI");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      headlines: parsed.headlines || [],
      quote: parsed.quote || "",
      body: parsed.body || ""
    };
  } catch (error: any) {
    console.error("DeepSeek API error:", error);
    throw new Error(`Ошибка генерации: ${error.message}`);
  }
}

export function cleanOcrText(text: string): string {
  let cleaned = text
    .replace(/[^\u0400-\u04FF\u0020-\u007Ea-zA-Z0-9.,!?;:'"()\-\n]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/([.,!?;:])\s*\1+/g, "$1")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  
  cleaned = cleaned
    .split(/\s+/)
    .filter(word => {
      if (word.length <= 2) return true;
      const letters = (word.match(/[а-яА-Яa-zA-Z]/g) || []).length;
      return letters / word.length > 0.5;
    })
    .join(" ");
  
  return cleaned;
}

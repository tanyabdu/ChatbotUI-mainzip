import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface ContentGenerationInput {
  goal: "sale" | "engagement";
  niche: string;
  days: number;
  product?: string;
  strategy?: "general" | "launch";
}

export interface GeneratedContentDay {
  day: number;
  title: string;
  type: string;
  content: string;
  hashtags: string[];
}

export async function generateContentStrategy(input: ContentGenerationInput): Promise<GeneratedContentDay[]> {
  const { goal, niche, days, product, strategy } = input;
  
  const goalDescription = goal === "sale" 
    ? `продажа продукта/услуги: "${product || 'консультация'}"` 
    : "увеличение охватов и вовлечённости аудитории";
  
  const strategyDescription = strategy === "launch"
    ? "Структура запуска: предзапуск → открытие → дедлайны → закрытие"
    : "Сбалансированный микс: экспертный контент + личные истории + мягкие продажи";

  const systemPrompt = `Ты — эксперт по контент-маркетингу для эзотерических практиков (тарологи, астрологи, нумерологи).
Твоя задача — создавать контент-планы для социальных сетей.

Правила:
- Пиши на русском языке
- Используй мистический, вдохновляющий стиль
- Каждый пост должен быть уникальным и вовлекающим
- Добавляй релевантные хэштеги для эзотерической ниши
- Учитывай специфику ниши пользователя
- Контент должен быть готов к публикации

Формат ответа — строго JSON массив объектов:
[
  {
    "day": 1,
    "title": "Заголовок поста",
    "type": "Тип контента (Экспертный/Личная история/Продающий/Вовлекающий)",
    "content": "Полный текст поста готовый к публикации (2-3 абзаца)",
    "hashtags": ["#хэштег1", "#хэштег2", "#хэштег3"]
  }
]`;

  const userPrompt = `Создай контент-план на ${days} ${getDaysWord(days)} для:

Ниша: ${niche}
Цель: ${goalDescription}
${goal === "sale" ? `Стратегия: ${strategyDescription}` : ""}
${product ? `Продукт для продажи: ${product}` : ""}

Требования:
- Каждый день должен иметь уникальную тему
- Чередуй типы контента для разнообразия
- Учитывай воронку: знакомство → доверие → ${goal === "sale" ? "покупка" : "вовлечение"}
- Посты должны быть готовы к копированию и публикации

Верни ТОЛЬКО JSON массив без дополнительного текста.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Failed to parse content strategy response:", content);
      throw new Error("Invalid response format from AI");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedContentDay[];
    return parsed;
  } catch (error) {
    console.error("Content generation error:", error);
    throw error;
  }
}

function getDaysWord(days: number): string {
  if (days === 1) return "день";
  if (days >= 2 && days <= 4) return "дня";
  return "дней";
}

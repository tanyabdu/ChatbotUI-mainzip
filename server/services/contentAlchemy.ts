import OpenAI from "openai";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface AlchemyTopic {
  day: number;
  topic: string;
  description: string;
}

export async function generateContentPlan(
  daysCount: number,
  contentType: string,
  warmupTarget: string
): Promise<AlchemyTopic[]> {
  const contentTypeLabels: Record<string, string> = {
    selling: "продающий (с призывами к покупке, демонстрацией результатов)",
    expert: "экспертный (демонстрация профессионализма, полезная информация)",
    warmup: "прогревающий (подогрев интереса, сторителлинг, личность эксперта)",
  };

  const prompt = `Ты — опытный SMM-стратег для экспертов в сфере эзотерики, психологии и коучинга.

Создай контент-план на ${daysCount} дней.
Тип контента: ${contentTypeLabels[contentType] || contentType}
Цель прогрева: ${warmupTarget}

Требования:
1. Каждая тема должна быть уникальной и вести к конечной цели
2. Темы должны постепенно усиливать интерес аудитории
3. Учитывай психологию прогрева: от осознания проблемы к желанию решения
4. Используй разнообразие форматов: истории, экспертные посты, отзывы, лайфстайл

Ответь ТОЛЬКО валидным JSON массивом в формате:
[
  {"day": 1, "topic": "Тема поста", "description": "Краткое описание о чём писать"},
  {"day": 2, "topic": "...", "description": "..."}
]

Без дополнительного текста, только JSON.`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "[]";
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse content plan:", content);
    throw new Error("Не удалось сгенерировать план. Попробуйте ещё раз.");
  }
}

export async function generateQuestions(topic: string, description: string): Promise<string[]> {
  const prompt = `Ты — опытный контент-стратег. Эксперт хочет написать пост на тему: "${topic}"
${description ? `Описание: ${description}` : ""}

Создай 4-5 наводящих вопросов, которые помогут эксперту раскрыть тему через свой личный опыт и экспертизу.

Вопросы должны:
1. Помочь вспомнить реальные истории и кейсы
2. Раскрыть уникальный подход эксперта
3. Добавить эмоциональность и личность
4. Быть простыми и понятными

Ответь ТОЛЬКО JSON массивом вопросов:
["Вопрос 1?", "Вопрос 2?", "Вопрос 3?", "Вопрос 4?"]`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || "[]";
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse questions:", content);
    throw new Error("Не удалось сгенерировать вопросы. Попробуйте ещё раз.");
  }
}

export async function generatePostFromAnswers(
  topic: string,
  answers: { question: string; answer: string }[]
): Promise<string> {
  const answersText = answers
    .map((a, i) => `Вопрос ${i + 1}: ${a.question}\nОтвет: ${a.answer}`)
    .join("\n\n");

  const prompt = `Ты — профессиональный копирайтер для экспертов в сфере эзотерики, психологии и коучинга.

Тема поста: ${topic}

Ответы эксперта на наводящие вопросы:
${answersText}

Создай готовый пост для социальных сетей на основе этих ответов.

Требования:
1. Сохрани голос и стиль эксперта из ответов
2. Структурируй текст логично и читабельно
3. Добавь цепляющее начало
4. Используй абзацы для удобства чтения
5. Добавь призыв к действию в конце (комментарий, лайк, сохранение)
6. Длина: 1500-2500 символов
7. Не добавляй хештеги

Напиши ТОЛЬКО готовый текст поста, без пояснений.`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "";
  
  if (!content.trim()) {
    throw new Error("Не удалось сгенерировать пост. Попробуйте ещё раз.");
  }

  return content.trim();
}

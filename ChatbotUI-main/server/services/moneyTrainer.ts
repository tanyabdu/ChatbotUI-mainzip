import OpenAI from "openai";
import type { SalesTrainerSample } from "@shared/schema";

const SYSTEM_PROMPT = `Ты — тренер по продажам для эзотерических экспертов (тарологов, астрологов, нумерологов).
Твоя задача — улучшить черновик ответа эксперта на вопрос клиента так, чтобы:

1. ПРИЗНАНИЕ БОЛИ: Начать с эмпатии, показать что понимаешь переживания клиента
2. КРАТКИЙ ОТВЕТ: Дать частичный ответ на вопрос, но не полный — оставить интригу
3. ПРОБЛЕМАТИЗАЦИЯ: Мягко показать, что в двух словах на такой важный вопрос не ответить
4. КОНКРЕТНОЕ ПРЕДЛОЖЕНИЕ: Предложить консультацию с перечислением что клиент узнает
5. CTA: Призыв к действию — написать в личку, записаться

Стиль: тёплый, заботливый, профессиональный. Без давления, но с мотивацией.
Используй списки с тире или буллитами для перечислений. НЕ используй эмодзи.
Ответ должен быть на русском языке.`;

interface GenerateImprovedAnswerParams {
  clientQuestion: string;
  expertDraft: string;
  painType?: string;
  offerType?: string;
  samples: SalesTrainerSample[];
}

export async function generateImprovedAnswer(
  params: GenerateImprovedAnswerParams
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не настроен");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.deepseek.com",
  });

  const fewShotExamples = params.samples.slice(0, 3).map((sample, i) => `
--- Пример ${i + 1} ---
Вопрос клиента: ${sample.clientQuestion}
${sample.expertDraft ? `Черновик эксперта: ${sample.expertDraft}` : ''}
Улучшенный ответ: ${sample.improvedAnswer}
${sample.coachFeedback ? `Комментарий тренера: ${sample.coachFeedback}` : ''}
`).join('\n');

  const userPrompt = `${fewShotExamples ? `Вот примеры успешных ответов:\n${fewShotExamples}\n\n` : ''}
Теперь улучши этот ответ:

Вопрос клиента: ${params.clientQuestion}
${params.painType ? `Тип боли клиента: ${params.painType}` : ''}
Черновик ответа эксперта: ${params.expertDraft}
${params.offerType ? `Желаемое предложение: ${params.offerType}` : ''}

Напиши улучшенную версию ответа, которая закроет клиента на продажу:`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || "Не удалось сгенерировать ответ";
  } catch (error: any) {
    console.error("DeepSeek API error:", error);
    throw new Error(`Ошибка API: ${error.message}`);
  }
}

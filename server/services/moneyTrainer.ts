import type { SalesTrainerSample } from "@shared/schema";
import { withRetry, extractContent } from "./deepseekRetry";
import { getDeepseekClient, AI_MODEL } from "./deepseekClient";

const OFFER_LABELS: Record<string, string> = {
  consultation: "Консультация",
  forecast: "Прогноз на год",
  compatibility: "Совместимость",
  natal_chart: "Натальная карта",
  tarot_spread: "Расклад Таро",
  marathon: "Марафон",
  course: "Курс",
  workshop: "Практикум",
  masterclass: "Мастер-класс",
  guide: "Гайд",
  webinar: "Вебинар",
  subscription: "Подписка",
  mentoring: "Наставничество",
  retreat: "Ретрит",
};

function getOfferLabel(offerType?: string): string {
  if (!offerType) return "";
  return OFFER_LABELS[offerType] || offerType;
}

// ~300 tokens — well under the ~1500-token YandexGPT threshold; no compact variant needed.
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
  const client = getDeepseekClient();

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
${params.offerType ? `Желаемое предложение: ${getOfferLabel(params.offerType)}` : ''}

Напиши улучшенную версию ответа, которая закроет клиента на продажу:`;

  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = extractContent(response);
    if (!content) {
      throw new Error("Пустой ответ от AI");
    }
    return content;
  }, "MoneyTrainer");
}

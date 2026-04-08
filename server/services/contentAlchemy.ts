import { withRetry, extractContent, ParseError } from "./deepseekRetry";
import { getDeepseekClient } from "./deepseekClient";

const deepseek = getDeepseekClient();

export interface AlchemyTopic {
  day: number;
  topic: string;
  description: string;
  type: string;
}

export interface ArchetypeData {
  name: string;
  description: string;
  recommendations: string[];
  triggerWords?: string[];
  contentStyle?: string[];
  tone?: string;
}

const COMMON_OBJECTIONS = [
  { objection: "дорого/нет денег", closing: "Покажи цену бездействия: сколько стоит оставаться в этой ситуации ещё год? Сравни с ежедневными тратами." },
  { objection: "не сработает у меня", closing: "Приведи примеры разных клиенток: разный возраст, ситуации. Покажи что метод работает независимо от обстоятельств." },
  { objection: "нет времени", closing: "Покажи минимум времени на результат. Сколько минут в день нужно?" },
  { objection: "надо подумать", closing: "Объясни что 'подумать' = отложить решение навсегда. Что изменится через неделю размышлений?" },
  { objection: "у меня особая ситуация", closing: "Расскажи о клиентке с 'особой ситуацией' которая тоже так думала." },
  { objection: "уже пробовала, не помогло", closing: "Объясни чем твой подход отличается от того что не сработало." },
  { objection: "страшно/не уверена", closing: "Нормализуй страх. Расскажи про свой страх когда начинала." }
];

const PRESENTATION_FORMATS = [
  "Личная история с моралью",
  "Чеклист/список пунктов", 
  "Разбор кейса клиентки",
  "Вопрос-ответ (FAQ)",
  "Мифы vs реальность",
  "Пошаговая инструкция",
  "До/После с деталями",
  "Письмо себе прошлой",
  "Разбор ошибок",
  "Закулисье работы"
];

function getWarmupStructure(days: number): string {
  if (days <= 7) {
    return `
СТРУКТУРА ПРОГРЕВА НА ${days} ДНЕЙ:
День 1: ЗНАКОМСТВО + БОЛЬ — личная история, покажи что понимаешь боль аудитории
День 2: ЭКСПЕРТНЫЙ — дай пользу, покажи компетентность без продажи  
День 3: ЗАКРЫТИЕ ВОЗРАЖЕНИЯ — работа с сомнениями аудитории
День 4: КЕЙС/ОТЗЫВ — история клиентки с результатом
День 5: ЗАКРЫТИЕ ВОЗРАЖЕНИЯ — ещё одно типичное сомнение
День 6: ПРОДАЮЩИЙ МЯГКИЙ — расскажи о продукте через пользу
День 7: ПРОДАЮЩИЙ + ДЕДЛАЙН — последний шанс, срочность`;
  }
  
  if (days <= 14) {
    return `
СТРУКТУРА ПРОГРЕВА НА ${days} ДНЕЙ:

ДНИ 1-3: ЗНАКОМСТВО + БОЛИ АУДИТОРИИ
- День 1: Личная история — почему ты занимаешься этим, через какую боль прошла сама
- День 2: Главная боль аудитории — покажи что понимаешь их проблему изнутри  
- День 3: Вторая боль — ещё одна проблема, которую решает твой продукт

ДНИ 4-6: ЭКСПЕРТНЫЙ КОНТЕНТ
- День 4: Полезный чеклист/инструкция — дай реальную пользу бесплатно
- День 5: Разбор ошибок — что делают неправильно и к чему это приводит
- День 6: Лайфхак/метод — покажи часть своей методики

ДНИ 7-9: ЗАКРЫТИЕ ВОЗРАЖЕНИЙ  
- День 7: "Дорого/нет денег" — покажи цену бездействия
- День 8: "Не сработает у меня" — докажи универсальность через примеры
- День 9: "Нет времени" — покажи быстрые результаты

ДНИ 10-12: СОЦИАЛЬНЫЕ ДОКАЗАТЕЛЬСТВА
- День 10: Кейс клиентки #1 — история "было/стало"
- День 11: Кейс клиентки #2 — другой типаж
- День 12: Подборка отзывов — массовое подтверждение

ДНИ 13-14: ПРОДАЖА + ДЕДЛАЙН
- День 13: Мягкая продажа — подробно о продукте
- День 14: Жёсткий дедлайн — срочность`;
  }
  
  return `
СТРУКТУРА ПРОГРЕВА НА ${days} ДНЕЙ:

НЕДЕЛЯ 1: ЗНАКОМСТВО И ДОВЕРИЕ
- Дни 1-2: Личные истории, почему занимаешься этой темой
- Дни 3-4: Главные боли аудитории, покажи понимание
- Дни 5-7: Экспертный контент, полезные советы бесплатно

НЕДЕЛЯ 2: ЭКСПЕРТИЗА И ВОЗРАЖЕНИЯ
- Дни 8-10: Глубокий экспертный контент, разбор ошибок
- Дни 11-14: Закрытие возражений (дорого, не сработает, нет времени)

НЕДЕЛЯ 3: СОЦИАЛЬНЫЕ ДОКАЗАТЕЛЬСТВА
- Дни 15-18: Кейсы клиенток разных типажей
- Дни 19-21: Отзывы, истории успеха, до/после

НЕДЕЛЯ 4: ПРОДАЖА
- Дни 22-25: Мягкие продажи, подробности о продукте
- Дни 26-28: Ответы на вопросы, работа с сомнениями
- Дни 29-30: Дедлайн, последний шанс`;
}

export async function generateContentPlan(
  daysCount: number,
  warmupTarget: string,
  archetype?: ArchetypeData
): Promise<AlchemyTopic[]> {
  const warmupStructure = getWarmupStructure(daysCount);
  
  const shuffledObjections = [...COMMON_OBJECTIONS].sort(() => Math.random() - 0.5);
  const selectedObjections = shuffledObjections.slice(0, 3);
  
  const shuffledFormats = [...PRESENTATION_FORMATS].sort(() => Math.random() - 0.5);
  const selectedFormats = shuffledFormats.slice(0, 5).join(", ");
  
  const objectionsText = selectedObjections.map((o, i) => 
    `${i + 1}. "${o.objection}" — ${o.closing}`
  ).join('\n');

  const archetypeInstruction = archetype 
    ? `
АРХЕТИП БРЕНДА: "${archetype.name}"
${archetype.description}
${archetype.tone ? `Тональность: ${archetype.tone}` : ''}
${archetype.triggerWords?.length ? `Слова-триггеры: ${archetype.triggerWords.slice(0, 8).join(", ")}` : ''}
${archetype.contentStyle?.length ? `Стиль: ${archetype.contentStyle.slice(0, 3).join("; ")}` : ''}
Ключевые слова: ${archetype.recommendations.join(", ")}

Пиши в стиле этого архетипа!`
    : "";

  const prompt = `Ты — маркетолог-стратег, специалист по ПРОГРЕВАМ И ЗАПУСКАМ продуктов для экспертов в сфере эзотерики, психологии и коучинга.

Создай контент-план на ${daysCount} дней для прогрева к: "${warmupTarget}"

${warmupStructure}

ВОЗРАЖЕНИЯ ДЛЯ ЗАКРЫТИЯ В КОНТЕНТЕ:
${objectionsText}

ИСПОЛЬЗУЙ РАЗНООБРАЗИЕ ФОРМАТОВ:
${selectedFormats}
${archetypeInstruction}

КРИТИЧЕСКИ ВАЖНО — УНИВЕРСАЛЬНОСТЬ ТЕМ:
Темы должны быть УНИВЕРСАЛЬНЫМИ НАПРАВЛЕНИЯМИ, а не готовыми личными историями!
Эксперт будет отвечать на наводящие вопросы — именно через них раскроется ЕГО личный опыт.

НЕ ПРИДУМЫВАЙ конкретные истории за эксперта!
- НЕ ПИШИ: "Как я 3 года встречала 14 февраля одна" — это может быть не его история
- НЕ ПИШИ: "Клиентка Марина от развода до..." — эксперт сам расскажет свои кейсы
- НЕ ПИШИ конкретные цифры, имена, детали которых может не быть у эксперта

ПИШИ УНИВЕРСАЛЬНЫЕ НАПРАВЛЕНИЯ С ФОРМАТОМ:
- "Личная история: момент осознания своего главного паттерна" — эксперт расскажет СВОЙ момент
- "Ваша боль, которая привела в профессию" — каждый эксперт ответит ПО-СВОЕМУ
- "Кейс клиентки с быстрым результатом (формат до/после)" — эксперт выберет СВОЙ кейс
- "5 признаков проблемы которую решает ваш продукт — чеклист" — конкретика по нише

ПРИМЕРЫ ХОРОШИХ ТЕМ (универсальные):
- "Личная история: момент когда вы поняли главную причину своих неудач в [теме]"
- "Ваш путь в профессию — через какую боль вы прошли сами"
- "Кейс клиентки: трансформация за короткий срок (формат до/после)"
- "3-5 признаков что пора решать эту проблему — чеклист для читателя"
- "Главное возражение ваших клиенток и как вы его закрываете"
- "Ошибка которую совершают 90% людей в вашей теме"

ПРИМЕРЫ ПЛОХИХ ТЕМ (слишком конкретные — НЕ ИСПОЛЬЗУЙ):
- "Как я 3 года была одинокой" — это может быть НЕ история эксперта
- "Клиентка Анна заработала миллион" — откуда ты знаешь её клиенток?
- "Мой развод научил меня..." — а если эксперт не был в разводе?

Ответь ТОЛЬКО валидным JSON массивом:
[
  {"day": 1, "topic": "Универсальное направление темы", "description": "Какой формат использовать, что раскрыть через вопросы", "type": "Знакомство"},
  {"day": 2, "topic": "...", "description": "...", "type": "Экспертный"}
]

Типы контента: Знакомство, Экспертный, Возражение, Кейс, Продающий`;

  return withRetry(async () => {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 8000,
    });

    const content = extractContent(response) || "[]";
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        if (!jsonStr.endsWith(']')) {
          const lastCompleteObj = jsonStr.lastIndexOf('},');
          if (lastCompleteObj > 0) {
            jsonStr = jsonStr.substring(0, lastCompleteObj + 1) + ']';
          } else {
            const lastObj = jsonStr.lastIndexOf('}');
            if (lastObj > 0) {
              jsonStr = jsonStr.substring(0, lastObj + 1) + ']';
            }
          }
        }
        
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse content plan:", content);
      throw new ParseError("Не удалось сгенерировать план");
    }
  }, "ContentAlchemy:generatePlan");
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

  return withRetry(async () => {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = extractContent(response) || "[]";
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse questions:", content);
      throw new ParseError("Не удалось сгенерировать вопросы");
    }
  }, "ContentAlchemy:generateQuestions");
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

  return withRetry(async () => {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = extractContent(response);
    
    if (!content?.trim()) {
      throw new Error("Пустой ответ от AI");
    }

    return content.trim();
  }, "ContentAlchemy:generatePost");
}

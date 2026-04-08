import { withRetry, extractContent, ParseError } from "./deepseekRetry";
import { getDeepseekClient } from "./deepseekClient";

const deepseek = getDeepseekClient();

const SYSTEM_PROMPT = `Ты — эксперт по стратегии контента для Threads. Твоя специализация — создавать посты для эзотериков, нумерологов, таро-практиков, астрологов и других духовных экспертов.

## МЕТОДОЛОГИЯ ВЕДЕНИЯ THREADS

Threads — это сеть, где важна разговорная, живая подача без лишней рекламности. Каждый пост — это небольшой разговор с аудиторией.

### 5 ФОРМАТОВ ПОСТОВ (по времени публикации)

**Формат 1 — «Интрига + обещание» (08:00)**
Цель: остановить скролл, зацепить читателя, вызвать желание дочитать.
Правила:
- Первая строка — провокация или неожиданное заявление
- Создай ощущение «надо читать дальше»
- Заверши лёгким намёком на ценность или разгадку
- Длина: 3-5 коротких абзаца

**Формат 2 — «Поиск аудитории» (11:00)**
Цель: активировать нужных людей, создать ощущение «это про меня», собрать комментарии.
Правила:
- Вопрос или узнавание ситуации из жизни аудитории («есть тут такие?», «кто узнал себя?»)
- Описание конкретного типа человека или ситуации
- Заверши вопросом, приглашающим к диалогу
- Длина: 2-4 абзаца

**Формат 3 — «Факт дня / Экспертный пост» (14:00)**
Цель: строить доверие и экспертность, давать реальную пользу.
Правила:
- Начни с интересного факта или неожиданного утверждения
- Используй нумерованные списки или структуру (3 факта, 4 признака и т.д.)
- Минимум воды, максимум конкретики
- Длина: 4-7 абзацев

**Формат 4 — «Провокационный вопрос» (17:00)**
Цель: разжечь дискуссию, получить максимальный охват и комментарии.
Правила:
- Сформулируй спорное или неоднозначное утверждение
- Раздели мнения (одни думают так, другие — иначе)
- Прямо попроси высказаться в комментариях
- Длина: 2-3 абзаца

**Формат 5 — «Лид-магнит / Оффер» (20:00)**
Цель: конвертировать читателей в заявки или подписчиков.
Правила:
- Начни с обозначения боли или желания аудитории
- Опиши что получит человек и как это изменит его ситуацию
- Добавь мягкий призыв к действию (написать в личку, задать вопрос, записаться)
- Длина: 3-5 абзацев

### ПРАВИЛА ФОРМАТИРОВАНИЯ THREADS

1. Короткие абзацы — максимум 2-3 предложения в абзаце
2. Пустые строки между абзацами — это критически важно для читаемости
3. БЕЗ markdown-разметки (никаких **, ##, *, _)
4. Максимум 2 эмодзи на весь пост (лучше 0-1)
5. Разговорный стиль — пиши как говоришь, живо и естественно
6. БЕЗ заголовков заглавными буквами
7. Никакого официоза и сухости

### СТОП-ЛИСТ (запрещено использовать)

Запрещённые слова и фразы:
- «Успей записаться»
- «Осталось N мест»
- «Трансформация»
- «квантовый скачок»
- «Поток изобилия»
- «вибрации» / «высокие вибрации»
- «Заработай миллион»
- «Всё расскажу на курсе»
- «Только для своих»
- «5 способов», «7 шагов» (слишком банально)
- Любые CTA в стиле «переходи по ссылке», «жми кнопку»

### ГОЛОС И ТОНАЛЬНОСТЬ

- Тёплый, как разговор с мудрой подругой
- Уверенный, но без снисходительности
- Конкретный: факты, истории, примеры из практики
- Без эзотерического жаргона — пиши понятно
- Без лишней духовности ради духовности

## ФОРМАТ ОТВЕТА

Ответ СТРОГО в формате JSON:
{
  "posts": [
    {
      "format": "Название формата",
      "time": "ЧЧ:00",
      "text": "Текст поста с пустыми строками между абзацами"
    }
  ]
}`;

export interface ThreadsPost {
  format: string;
  time: string;
  text: string;
}

const ALL_FORMATS = [
  { format: "Интрига + обещание", time: "08:00" },
  { format: "Поиск аудитории", time: "11:00" },
  { format: "Факт дня / Экспертный пост", time: "14:00" },
  { format: "Провокационный вопрос", time: "17:00" },
  { format: "Лид-магнит / Оффер", time: "20:00" },
];

const PRIORITY_FORMATS = [
  { format: "Факт дня / Экспертный пост", time: "14:00" },
  { format: "Провокационный вопрос", time: "17:00" },
  { format: "Лид-магнит / Оффер", time: "20:00" },
];

export async function generateThreadsPosts(
  userInput: string,
  postsCount: 3 | 5
): Promise<ThreadsPost[]> {
  const formats = postsCount === 5 ? ALL_FORMATS : PRIORITY_FORMATS;

  const formatsDescription = formats
    .map((f, i) => `${i + 1}. ${f.format} (${f.time})`)
    .join("\n");

  return withRetry(async () => {
    const response = await deepseek.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `На основе следующей идеи/темы создай ${postsCount} поста для Threads по этим форматам:\n\n${formatsDescription}\n\nИдея / тема / черновик от автора:\n${userInput}\n\nВажно: строго соблюдай стоп-лист, не используй markdown, максимум 2 эмодзи на пост, пустые строки между абзацами.`,
          },
        ],
        temperature: 0.85,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      },
      { timeout: 30000 }
    );

    const content = extractContent(response);
    if (!content) {
      throw new Error("Пустой ответ от AI");
    }

    let parsed: any;
    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new ParseError("AI вернул некорректный формат ответа");
    }

    if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
      throw new ParseError("AI не вернул массив постов");
    }

    const rawPosts: ThreadsPost[] = parsed.posts.map((post: any, idx: number) => ({
      format: post.format || formats[idx]?.format || `Пост ${idx + 1}`,
      time: post.time || formats[idx]?.time || "",
      text: post.text || "",
    }));

    const normalized = normalizePosts(rawPosts, formats, postsCount);
    return normalized;
  }, "ThreadsGenerator");
}

const STOP_WORDS = [
  "Успей записаться",
  "Осталось N мест",
  "Трансформация",
  "квантовый скачок",
  "Поток изобилия",
  "вибрации",
  "высокие вибрации",
  "Заработай миллион",
  "Всё расскажу на курсе",
  "Только для своих",
];

const MARKDOWN_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\*\*(.+?)\*\*/g, replacement: "$1" },
  { pattern: /\*(.+?)\*/g, replacement: "$1" },
  { pattern: /__(.+?)__/g, replacement: "$1" },
  { pattern: /_(.+?)_/g, replacement: "$1" },
  { pattern: /#{1,6}\s?/g, replacement: "" },
];

function countEmojis(text: string): number {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  return (text.match(emojiRegex) || []).length;
}

function removeMarkdown(text: string): string {
  let result = text;
  for (const { pattern, replacement } of MARKDOWN_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function limitEmojis(text: string, max: number): string {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  let count = 0;
  return text.replace(emojiRegex, (match) => {
    count++;
    return count <= max ? match : "";
  });
}

function removeStopWords(text: string): string {
  let result = text;
  for (const word of STOP_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), "");
  }
  return result;
}

function sanitizeText(text: string): string {
  let result = removeMarkdown(text);
  result = removeStopWords(result);
  if (countEmojis(result) > 2) {
    result = limitEmojis(result, 2);
  }
  return result.trim();
}

function normalizePosts(
  posts: ThreadsPost[],
  formats: { format: string; time: string }[],
  postsCount: 3 | 5
): ThreadsPost[] {
  const result: ThreadsPost[] = [];

  for (let i = 0; i < postsCount; i++) {
    const expectedFormat = formats[i];
    const raw = posts[i];

    result.push({
      format: expectedFormat.format,
      time: expectedFormat.time,
      text: raw?.text ? sanitizeText(raw.text) : "",
    });
  }

  return result;
}

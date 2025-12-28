import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return client;
}

export interface ContentGenerationInput {
  goal: "sale" | "engagement";
  niche: string;
  days: number;
  product?: string;
  strategy?: "general" | "launch";
  archetype?: {
    name: string;
    description: string;
    recommendations: string[];
    triggerWords?: string[];
    contentStyle?: string[];
    tone?: string;
  };
}

export interface FormatContent {
  content: string;
  hashtags: string[];
}

export interface GeneratedContentDay {
  day: number;
  idea: string;
  type: string;
  post: FormatContent;
  carousel: FormatContent;
  reels: FormatContent;
  stories: FormatContent;
}

function fixHashtagsArray(jsonStr: string): string {
  // Find hashtags arrays and fix unquoted values
  // Pattern: "hashtags": [ ... ]
  return jsonStr.replace(/"hashtags"\s*:\s*\[([^\]]*)\]/g, (match, arrayContent) => {
    // Split by comma, but be careful with quoted strings
    const items: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of arrayContent) {
      if (char === '"' && (current.length === 0 || current[current.length - 1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        if (current.trim()) {
          items.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      items.push(current.trim());
    }
    
    // Fix each item
    const fixedItems = items.map(item => {
      item = item.trim();
      // Already properly quoted
      if (item.startsWith('"') && item.endsWith('"')) {
        return item;
      }
      // Single quoted - convert to double
      if (item.startsWith("'") && item.endsWith("'")) {
        return `"${item.slice(1, -1)}"`;
      }
      // Unquoted hashtag or text - add quotes
      return `"${item.replace(/"/g, '\\"')}"`;
    });
    
    return `"hashtags": [${fixedItems.join(', ')}]`;
  });
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Fix hashtags arrays specifically
  cleaned = fixHashtagsArray(cleaned);
  
  // Fix trailing commas before closing brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  return cleaned;
}

function parseContentResponse(content: string): GeneratedContentDay[] {
  // Try to extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON array found in response:", content.substring(0, 500));
    throw new Error("Invalid response format from AI");
  }
  
  let jsonStr = jsonMatch[0];
  
  // First attempt: parse as-is
  try {
    return JSON.parse(jsonStr) as GeneratedContentDay[];
  } catch (e) {
    console.log("First parse attempt failed, trying to clean JSON...");
  }
  
  // Second attempt: clean and parse
  try {
    const cleaned = cleanJsonResponse(jsonStr);
    return JSON.parse(cleaned) as GeneratedContentDay[];
  } catch (e) {
    console.log("Second parse attempt failed, trying line-by-line fix...");
  }
  
  // Third attempt: try to fix line by line
  try {
    // More aggressive: try to manually reconstruct valid JSON
    let fixed = jsonStr;
    
    // Fix common issues with hashtags arrays
    // Match "hashtags": [ and everything until ]
    const hashtagPattern = /"hashtags"\s*:\s*\[([^\]]+)\]/g;
    fixed = fixed.replace(hashtagPattern, (match, content) => {
      // Split on commas that are not inside quotes
      const parts = content.split(',').map((p: string) => {
        p = p.trim();
        // Remove leading/trailing whitespace and newlines
        p = p.replace(/^[\s\n]+|[\s\n]+$/g, '');
        
        // If starts with # and not in quotes, quote it
        if (p.startsWith('#') && !p.startsWith('"')) {
          return `"${p}"`;
        }
        // If in quotes, keep as is
        if (p.startsWith('"') && p.endsWith('"')) {
          return p;
        }
        // Otherwise wrap in quotes
        if (p && !p.startsWith('"')) {
          return `"${p}"`;
        }
        return p;
      }).filter((p: string) => p.length > 0);
      
      return `"hashtags": [${parts.join(', ')}]`;
    });
    
    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    return JSON.parse(fixed) as GeneratedContentDay[];
  } catch (e) {
    console.error("All parse attempts failed. Error:", e);
    console.error("Raw content sample:", jsonStr.substring(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}

export async function generateContentStrategy(input: ContentGenerationInput): Promise<GeneratedContentDay[]> {
  const { goal, niche, days, product, strategy, archetype } = input;
  
  const strategyDescription = strategy === "launch"
    ? "Структура запуска: предзапуск → открытие → дедлайны → закрытие"
    : "Сбалансированный микс: экспертный контент + личные истории + мягкие продажи";
    
  const archetypeInstruction = archetype 
    ? `\n\nДНК БРЕНДА (ОБЯЗАТЕЛЬНО учитывай в стиле текста!):
Архетип: ${archetype.name}
Описание стиля: ${archetype.description}
${archetype.tone ? `Тональность: ${archetype.tone}` : ''}
${archetype.triggerWords?.length ? `Слова-триггеры (используй в текстах): ${archetype.triggerWords.slice(0, 10).join(", ")}` : ''}
${archetype.contentStyle?.length ? `Стиль контента: ${archetype.contentStyle.join("; ")}` : ''}
Ключевые слова бренда: ${archetype.recommendations.join(", ")}

ВАЖНО: Пиши в стиле архетипа "${archetype.name}". Используй соответствующий тон, слова-триггеры и настроение. Контент должен звучать как будто его писал человек с этим архетипом.`
    : "";

  // Principles from "Нейрокопирайтинг" by Kaplunov - natural, human language
  const writingStyleRules = `
ГЛАВНОЕ ПРАВИЛО: Клиент читает первое предложение — и СРАЗУ понимает, о чём речь. Никаких загадок.

ЧЕКЛИСТ ДЛЯ КАЖДОГО ТЕКСТА:
✓ Начни с КОНКРЕТНОЙ боли или желания ("Устала делать расклады, которые не сбываются?")
✓ Назови КОНКРЕТНЫЙ результат с цифрой или примером ("За 60 минут разберём твою ситуацию")
✓ Эзотерический термин? Тут же объясни простыми словами
✓ Призыв — что ИМЕННО сделать ("Напиши в директ 'хочу разбор'")

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
❌ "Вселенная приготовила/послала/показывает" — НЕЛЬЗЯ. Это абстракция. 
❌ "Энергии года/месяца/дня" без объяснения, что конкретно делать
❌ "Открой портал/канал/поток" — пустые слова
❌ "Трансформация/трансмутация/вибрации" без конкретного примера
❌ "Маршрутная карта года" — что это? Объясни или не пиши
❌ Любые космические метафоры без привязки к реальной жизни

КАК ПРАВИЛЬНО:
- Вместо "Вселенная приготовила уроки" → "В январе будет 2 сложные недели. Покажу, когда именно и что делать"
- Вместо "Открой поток изобилия" → "Разберём, почему клиенты не покупают. Найдём 3 причины"
- Вместо "Энергии года" → "2026 год — год девятки. Это значит: завершение циклов. Если тянешь старые проекты — самое время закрыть"

ПРИМЕРЫ:
❌ ПЛОХО: "Ты планируешь 2026, а Вселенная уже приготовила тебе сюрприз. Как не потратить год на борьбу с ветряными мельницами."
→ Проблема: "Вселенная приготовила сюрприз" — абстракция. "Борьба с мельницами" — непонятно что делать.

✅ ХОРОШО: "Планируешь 2026? Вот 3 периода, когда лучше не начинать важных дел: 14-28 января, 5-19 марта, 10-25 июля. Это ретрограды Меркурия — время, когда срываются договорённости. Запиши себе."
→ Конкретные даты. Понятно, что делать.

❌ ПЛОХО: "Астрология — это карта местности. Увидеть, где открытые дороги и крутые подъёмы."
✅ ХОРОШО: "На консультации разберём твой год по месяцам: когда лучше менять работу, когда — отложить крупные покупки, когда отношения будут в фокусе. Конкретные даты + рекомендации."

СТИЛЬ:
- Короткие предложения. Максимум 15 слов.
- Пиши как говоришь — как подруге за чаем.
- Эзотерику можно, но сразу объясняй простыми словами.`;

  // Different system prompts for sale vs engagement
  const saleSystemPrompt = `Ты — копирайтер для эзотерических практиков. Твоя суперсила — писать тексты, которые ПРОДАЮТ, но читаются легко, как сообщение от подруги.
${writingStyleRules}

ТВОЯ ЗАДАЧА: Создать продающий контент-план. На каждый день — идея + готовый контент в 4 форматах.

ВАЖНО ДЛЯ ПРОДАЖ:
- Начинай с боли клиента, не с продукта
- Покажи результат: "было → стало"
- Призыв к действию — конкретный и простой
- Упоминай продукт естественно, без навязывания

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: краткая идея/тема (1-2 предложения)
- type: тип (Экспертный/Личная история/Продающий/Вовлекающий)
- post: пост для ленты (2-3 коротких абзаца)
- carousel: карусель 5-7 слайдов (формат "Слайд 1: Заголовок\\nТекст...")
- reels: сценарий видео (Хук → Основа → Призыв)
- stories: серия 4-5 сторис (формат "Сторис 1: ...")

Формат: ТОЛЬКО JSON массив.
Пример: [{"day":1,"idea":"Почему расклады не работают без этого","type":"Экспертный","post":{"content":"Делаешь расклад. Карты говорят одно. Жизнь — другое.\\n\\nЗнакомо? Это не карты врут. Это...","hashtags":["#таро","#эзотерика"]},"carousel":{"content":"Слайд 1: 3 причины, почему расклады не сбываются\\n\\nСлайд 2: Причина 1...","hashtags":["#таро"]},"reels":{"content":"Хук: Карты врут? Нет. Проблема в другом.\\n\\nОснова: ...\\n\\nПризыв: Ссылка в шапке","hashtags":["#таро"]},"stories":{"content":"Сторис 1: Угадай, почему расклады не работают?\\n\\nСторис 2: ...","hashtags":["#таро"]}}]${archetypeInstruction}`;

  const engagementSystemPrompt = `Ты — копирайтер для эзотерических практиков. Твоя задача — писать тексты, которые хочется комментировать, сохранять, пересылать подругам.
${writingStyleRules}

ТВОЯ ЗАДАЧА: Создать вовлекающий контент-план для роста охватов.

ВАЖНО ДЛЯ ВОВЛЕЧЕНИЯ:
- Задавай вопросы, на которые хочется ответить
- Создавай интригу — пусть листают до конца
- Используй истории из жизни (реальные или близкие к реальным)
- Призыв к взаимодействию в конце

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: краткая идея/тема (1-2 предложения)
- type: тип (Экспертный/Личная история/Вовлекающий/Развлекательный)
- post: пост для ленты (2-3 коротких абзаца)
- carousel: карусель 5-7 слайдов (формат "Слайд 1: Заголовок\\nТекст...")
- reels: сценарий видео (Хук → Основа → Призыв)
- stories: серия 4-5 сторис (формат "Сторис 1: ...")

Формат: ТОЛЬКО JSON массив.
Пример: [{"day":1,"idea":"Какой ты архетип в отношениях","type":"Вовлекающий","post":{"content":"Королева. Девочка. Муза. Ведьма.\\n\\nКаждая из нас — микс. Но один архетип ведущий.\\n\\nКакой у тебя? Пиши в комментах — разберу!","hashtags":["#астрология"]},"carousel":{"content":"Слайд 1: 4 женских архетипа в любви\\n\\nСлайд 2: ...","hashtags":["#астрология"]},"reels":{"content":"Хук: Почему он не звонит? Дело не в нём.\\n\\nОснова: ...\\n\\nПризыв: Какой твой? Пиши!","hashtags":["#астрология"]},"stories":{"content":"Сторис 1: Тест! Выбери картинку...\\n\\nСторис 2: ...","hashtags":["#астрология"]}}]${archetypeInstruction}`;

  const systemPrompt = goal === "sale" ? saleSystemPrompt : engagementSystemPrompt;

  const userPrompt = goal === "sale" 
    ? `Создай ПРОДАЮЩИЙ контент-план на ${days} ${getDaysWord(days)} для:

НИША: ${niche}

ПРОДУКТ ДЛЯ ПРОДАЖИ: "${product || 'консультация'}"

СТРАТЕГИЯ: ${strategyDescription}

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
1. Создай ровно ${days} дней контента
2. На КАЖДЫЙ день создай:
   - idea: краткая идея дня
   - type: тип (Экспертный/Личная история/Продающий/Вовлекающий)
   - post: готовый текст для ленты (2-3 абзаца + призыв)
   - carousel: текст для карусели (5-7 слайдов, формат "Слайд 1: ...")
   - reels: сценарий рилс (хук → основа → призыв)
   - stories: серия сторис (4-5 слайдов, формат "Сторис 1: ...")
3. Каждый формат с hashtags массивом

Ответь ТОЛЬКО JSON массивом.`
    : `Создай контент-план на ${days} ${getDaysWord(days)} для ВОВЛЕЧЕНИЯ:

НИША: ${niche}

ЦЕЛЬ: Увеличить охваты, лайки, комментарии, сохранения

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
1. Создай ровно ${days} дней контента
2. На КАЖДЫЙ день создай:
   - idea: краткая идея дня
   - type: тип (Экспертный/Личная история/Вовлекающий/Развлекательный)
   - post: готовый текст для ленты (2-3 абзаца + призыв)
   - carousel: текст для карусели (5-7 слайдов, формат "Слайд 1: ...")
   - reels: сценарий рилс (хук → основа → призыв)
   - stories: серия сторис (4-5 слайдов, формат "Сторис 1: ...")
3. Каждый формат с hashtags массивом

Ответь ТОЛЬКО JSON массивом.`;

  try {
    console.log("Calling DeepSeek API...");
    const startTime = Date.now();
    
    const response = await getClient().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`DeepSeek API responded in ${elapsed}ms`);

    const content = response.choices[0]?.message?.content || "[]";
    console.log("Raw AI response length:", content.length);
    
    if (content.length < 100) {
      console.error("Response too short, content:", content);
      throw new Error("AI returned empty or too short response");
    }
    
    return parseContentResponse(content);
  } catch (error: any) {
    console.error("Content generation error:", error?.message || error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}

function getDaysWord(days: number): string {
  if (days === 1) return "день";
  if (days >= 2 && days <= 4) return "дня";
  return "дней";
}

// New interfaces for two-step generation
export interface ContentIdea {
  day: number;
  idea: string;
  type: string;
}

export interface SingleFormatInput {
  goal: "sale" | "engagement";
  niche: string;
  product?: string;
  idea: string;
  type: string;
  format: "post" | "carousel" | "reels" | "stories";
  archetype?: {
    name: string;
    description: string;
    recommendations: string[];
    triggerWords?: string[];
    contentStyle?: string[];
    tone?: string;
  };
}

// Step 1: Generate only ideas (fast, ~10-20 seconds)
export async function generateIdeasOnly(input: ContentGenerationInput): Promise<ContentIdea[]> {
  const { goal, niche, days, product, strategy, archetype } = input;
  
  const archetypeInstruction = archetype 
    ? `\n\nАрхетип бренда: ${archetype.name}. ${archetype.description}`
    : "";

  const systemPrompt = `Ты — стратег контента для эзотерических практиков.
Твоя задача: придумать цепляющие идеи для постов.

ПРАВИЛА ДЛЯ ИДЕЙ:
- Идея должна вызывать любопытство
- Формулируй как заголовок, который хочется кликнуть
- Избегай банальщины типа "Сила Луны" или "Магия Таро"
- Используй боли и желания аудитории${archetypeInstruction}`;

  const userPrompt = goal === "sale"
    ? `Придумай ${days} цепляющих идей для ПРОДАЮЩЕГО контента:
НИША: ${niche}
ПРОДУКТ: "${product || 'консультация'}"

Примеры ХОРОШИХ идей:
- "Почему твои расклады не сбываются (и что с этим делать)"
- "3 знака, что пора менять подход к практике"
- "Клиентка заплатила 50к и пропала. Что случилось дальше"

Для каждого дня:
- day: номер
- idea: цепляющая формулировка (1-2 предложения)
- type: тип (Экспертный/Личная история/Продающий/Вовлекающий)

JSON массив: [{"day":1,"idea":"...","type":"..."}]`
    : `Придумай ${days} цепляющих идей для ВОВЛЕКАЮЩЕГО контента:
НИША: ${niche}

Примеры ХОРОШИХ идей:
- "Какой ты архетип в отношениях? Тест"
- "5 вещей, которые делают все начинающие тарологи"
- "Угадай знак зодиака по привычке"

Для каждого дня:
- day: номер
- idea: цепляющая формулировка (1-2 предложения)
- type: тип (Экспертный/Личная история/Вовлекающий/Развлекательный)

JSON массив: [{"day":1,"idea":"...","type":"..."}]`;

  try {
    console.log("Generating ideas only...");
    const startTime = Date.now();
    
    const response = await getClient().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const elapsed = Date.now() - startTime;
    console.log(`Ideas generated in ${elapsed}ms`);

    const content = response.choices[0]?.message?.content || "[]";
    const cleaned = cleanJsonResponse(content);
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    
    return JSON.parse(jsonMatch[0]) as ContentIdea[];
  } catch (error: any) {
    console.error("Ideas generation error:", error?.message || error);
    throw error;
  }
}

// Step 2: Generate single format content (on demand)
export async function generateSingleFormat(input: SingleFormatInput): Promise<FormatContent> {
  const { goal, niche, product, idea, type, format, archetype } = input;
  
  const archetypeInstruction = archetype 
    ? `\n\nАРХЕТИП БРЕНДА: "${archetype.name}"
${archetype.description}
${archetype.tone ? `Тональность: ${archetype.tone}` : ''}
${archetype.triggerWords?.length ? `Слова-триггеры (используй в тексте): ${archetype.triggerWords.slice(0, 8).join(", ")}` : ''}
${archetype.contentStyle?.length ? `Стиль: ${archetype.contentStyle.slice(0, 3).join("; ")}` : ''}
Ключевые слова: ${archetype.recommendations.join(", ")}

Пиши в стиле этого архетипа!`
    : "";

  const writingRules = `
ГЛАВНОЕ: Клиент читает первое предложение — и СРАЗУ понимает, о чём речь.

ЧЕКЛИСТ:
✓ Начни с КОНКРЕТНОЙ боли ("Устала от раскладов, которые не сбываются?")
✓ Дай КОНКРЕТНЫЙ результат с цифрой ("За 60 минут разберём ситуацию")
✓ Термин? Объясни тут же простыми словами
✓ Призыв — что ИМЕННО сделать

ЗАПРЕЩЕНО:
❌ "Вселенная приготовила/послала" — абстракция
❌ "Энергии года" без конкретики что делать
❌ "Открой портал/поток" — пустые слова
❌ Космические метафоры без привязки к жизни

ВМЕСТО абстракций — конкретика:
- НЕ "Вселенная приготовила уроки" → А "В январе 2 сложные недели. Покажу когда и что делать"
- НЕ "Карта местности года" → А "Разберём по месяцам: когда менять работу, когда отложить покупки"

СТИЛЬ: Короткие предложения. Максимум 15 слов. Как подруге за чаем.`;

  const formatInstructions: Record<string, string> = {
    post: `Напиши ПОСТ для Instagram (2-3 коротких абзаца).
${writingRules}

Структура:
1. Хук — зацепи с первого предложения (вопрос, провокация, история)
2. Развитие — раскрой тему живым языком
3. Призыв — что сделать (конкретно)`,

    carousel: `Напиши КАРУСЕЛЬ из 5-7 слайдов.
${writingRules}

ФОРМАТ ОБЯЗАТЕЛЕН:
Первый слайд — крупный заголовок (хук, зацепить листать)
Затем каждый новый слайд отделяй символами ---
Последний слайд — призыв к действию

ПРИМЕР:
Почему твои расклады не работают

---

Причина 1: Ты спрашиваешь не то
Карты отвечают на конкретный вопрос. "Что будет?" — слишком размыто.

---

Причина 2: Не слышишь ответ
Карта показала одно, а ты хочешь другое. И игнорируешь.

---

Напиши мне — разберём твой вопрос правильно`,

    reels: `Напиши СЦЕНАРИЙ для Reels/видео.
${writingRules}

Структура:
'Хук: [первые 3 сек — зацепить]
Основа: [главная мысль, 20-30 сек]
Призыв: [что сделать]'

Говори от первого лица. Как будто снимаешь сама.`,

    stories: `Напиши серию из 4-5 СТОРИС.
${writingRules}

Формат:
'Сторис 1: [текст или описание]
Сторис 2: [следующий слайд]...'

Сторис 1 — зацепить (вопрос, интрига)
Последняя — призыв к действию`
  };

  const callToAction = goal === "sale" 
    ? `Мягко подведи к продукту "${product || 'консультация'}". Без давления, через пользу.`
    : "Попроси комментарий, реакцию или сохранение — естественно, не навязчиво.";

  const systemPrompt = `Ты — копирайтер для эзотерических практиков. Пишешь живым языком, как подруга подруге. Никакого официоза.${archetypeInstruction}`;

  const userPrompt = `${formatInstructions[format]}

НИША: ${niche}
ТИП: ${type}
ИДЕЯ: ${idea}
${callToAction}

JSON: {"content": "готовый текст", "hashtags": ["#тег1", "#тег2"]}`;

  try {
    console.log(`Generating ${format} for idea: ${idea.substring(0, 50)}...`);
    const startTime = Date.now();
    
    const response = await getClient().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`${format} generated in ${elapsed}ms`);

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = cleanJsonResponse(content);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    
    return JSON.parse(jsonMatch[0]) as FormatContent;
  } catch (error: any) {
    console.error(`${format} generation error:`, error?.message || error);
    throw error;
  }
}

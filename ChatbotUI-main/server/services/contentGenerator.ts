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
  const { goal, niche, days, product, strategy } = input;
  
  const strategyDescription = strategy === "launch"
    ? "Структура запуска: предзапуск → открытие → дедлайны → закрытие"
    : "Сбалансированный микс: экспертный контент + личные истории + мягкие продажи";

  // Different system prompts for sale vs engagement
  const saleSystemPrompt = `Ты — копирайтер-эксперт по ПРОДАЮЩЕМУ контенту для эзотерических практиков.

ТВОЯ ЗАДАЧА: Создать продающий контент-план, который приведёт клиентов.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Пиши на русском языке в мистическом, вдохновляющем стиле
2. КАЖДЫЙ пост должен заканчиваться ПРИЗЫВОМ К ДЕЙСТВИЮ:
   - "Записывайтесь в директ"
   - "Переходите по ссылке в шапке профиля"  
   - "Напишите мне для записи"
   - "Жду вас на консультации"
3. ОБЯЗАТЕЛЬНО используй описание продукта из задания в тексте
4. Упоминай конкретные выгоды продукта

Формат: ТОЛЬКО JSON массив с двойными кавычками.
Пример: [{"day":1,"title":"Заголовок","type":"Продающий","content":"Текст...\\n\\nЗаписывайтесь в директ!","hashtags":["#тег1","#тег2"]}]`;

  const engagementSystemPrompt = `Ты — копирайтер-эксперт по вовлекающему контенту для эзотерических практиков.

ТВОЯ ЗАДАЧА: Создать контент для увеличения охватов и вовлечённости.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Пиши на русском языке в мистическом, вдохновляющем стиле
2. КАЖДЫЙ пост должен заканчиваться ПРИЗЫВОМ К ВЗАИМОДЕЙСТВИЮ:
   - "Напишите в комментариях..."
   - "Сохраняйте себе!"
   - "Отметьте подругу, которой это нужно"
   - "Поделитесь в сторис"
3. Задавай вопросы аудитории
4. Создавай интригу и желание обсуждать

Формат: ТОЛЬКО JSON массив с двойными кавычками.
Пример: [{"day":1,"title":"Заголовок","type":"Вовлекающий","content":"Текст...\\n\\nНапишите в комментариях!","hashtags":["#тег1","#тег2"]}]`;

  const systemPrompt = goal === "sale" ? saleSystemPrompt : engagementSystemPrompt;

  const userPrompt = goal === "sale" 
    ? `Создай ПРОДАЮЩИЙ контент-план на ${days} ${getDaysWord(days)} для:

НИША: ${niche}

ПРОДУКТ ДЛЯ ПРОДАЖИ (ОБЯЗАТЕЛЬНО используй это описание в каждом посте!):
"${product || 'консультация'}"

СТРАТЕГИЯ: ${strategyDescription}

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
1. Создай ровно ${days} постов
2. В КАЖДОМ посте ЯВНО упоминай продукт и выгоды из описания выше
3. КАЖДЫЙ пост ОБЯЗАТЕЛЬНО заканчивай призывом: "Записывайтесь...", "Напишите мне...", "Переходите по ссылке..."
4. Текст 2-3 абзаца, готовый к публикации
5. 3-5 хэштегов

Типы постов:
- Экспертный (покажи экспертизу + упомяни продукт)
- Личная история (история + как продукт помогает)
- Продающий (прямая продажа с выгодами)
- Вовлекающий (вопрос + упоминание продукта)

Ответь ТОЛЬКО JSON массивом.`
    : `Создай контент-план на ${days} ${getDaysWord(days)} для ВОВЛЕЧЕНИЯ:

НИША: ${niche}

ЦЕЛЬ: Увеличить охваты, лайки, комментарии, сохранения

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
1. Создай ровно ${days} постов
2. Чередуй: Экспертный, Личная история, Вовлекающий (вопросы), Развлекательный
3. КАЖДЫЙ пост заканчивай призывом к взаимодействию:
   - "Напишите в комментариях..."
   - "Сохраняйте!"
   - "Отметьте подругу"
4. Текст 2-3 абзаца, 3-5 хэштегов

Ответь ТОЛЬКО JSON массивом.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    console.log("Raw AI response length:", content.length);
    
    return parseContentResponse(content);
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

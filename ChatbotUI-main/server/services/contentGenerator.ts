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
  archetype?: {
    name: string;
    description: string;
    recommendations: string[];
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
Ключевые слова для использования: ${archetype.recommendations.join(", ")}

Пиши в стиле этого архетипа — используй соответствующий тон, настроение и ключевые слова.`
    : "";

  // Different system prompts for sale vs engagement
  const saleSystemPrompt = `Ты — копирайтер-эксперт по ПРОДАЮЩЕМУ контенту для эзотерических практиков.

ТВОЯ ЗАДАЧА: Создать продающий контент-план с ИДЕЕЙ на каждый день и готовым контентом в 4 ФОРМАТАХ.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Пиши на русском языке в мистическом, вдохновляющем стиле
2. КАЖДЫЙ контент должен заканчиваться ПРИЗЫВОМ К ДЕЙСТВИЮ
3. ОБЯЗАТЕЛЬНО используй описание продукта в тексте
4. Упоминай конкретные выгоды продукта

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: краткая идея/тема дня (1-2 предложения)
- type: тип контента (Экспертный/Личная история/Продающий/Вовлекающий)
- post: текстовый пост для ленты (2-3 абзаца)
- carousel: карусель из 5-7 слайдов (каждый слайд с заголовком и текстом)
- reels: сценарий короткого видео (хук, основа, призыв)
- stories: серия из 4-5 сторис (текст каждого слайда)

Формат: ТОЛЬКО JSON массив.
Пример: [{"day":1,"idea":"Тема про силу Таро","type":"Экспертный","post":{"content":"Текст поста...","hashtags":["#таро","#эзотерика"]},"carousel":{"content":"Слайд 1: Заголовок\\nТекст...\\n\\nСлайд 2: ...","hashtags":["#таро"]},"reels":{"content":"Хук: Знаете почему...\\n\\nОснова: ...\\n\\nПризыв: Записывайтесь!","hashtags":["#таро"]},"stories":{"content":"Сторис 1: ...\\n\\nСторис 2: ...","hashtags":["#таро"]}}]${archetypeInstruction}`;

  const engagementSystemPrompt = `Ты — копирайтер-эксперт по вовлекающему контенту для эзотерических практиков.

ТВОЯ ЗАДАЧА: Создать контент-план с ИДЕЕЙ на каждый день и готовым контентом в 4 ФОРМАТАХ для увеличения охватов.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Пиши на русском языке в мистическом, вдохновляющем стиле
2. КАЖДЫЙ контент должен заканчиваться ПРИЗЫВОМ К ВЗАИМОДЕЙСТВИЮ
3. Задавай вопросы аудитории
4. Создавай интригу и желание обсуждать

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: краткая идея/тема дня (1-2 предложения)
- type: тип контента (Экспертный/Личная история/Вовлекающий/Развлекательный)
- post: текстовый пост для ленты (2-3 абзаца)
- carousel: карусель из 5-7 слайдов (каждый слайд с заголовком и текстом)
- reels: сценарий короткого видео (хук, основа, призыв)
- stories: серия из 4-5 сторис (текст каждого слайда)

Формат: ТОЛЬКО JSON массив.
Пример: [{"day":1,"idea":"Тема про знаки зодиака","type":"Вовлекающий","post":{"content":"Текст...\\n\\nНапишите в комментариях!","hashtags":["#астрология"]},"carousel":{"content":"Слайд 1: ...","hashtags":["#астрология"]},"reels":{"content":"Хук: А вы знали...","hashtags":["#астрология"]},"stories":{"content":"Сторис 1: ...","hashtags":["#астрология"]}}]${archetypeInstruction}`;

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
    
    const response = await client.chat.completions.create({
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

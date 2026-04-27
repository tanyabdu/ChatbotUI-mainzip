import { extractContent } from "./deepseekRetry";
import { sendErrorNotification } from "./email";
import { getDeepseekClient, AI_MODEL, getProvider } from "./deepseekClient";

function getClient() {
  return getDeepseekClient();
}

export interface ContentGenerationInput {
  goal: "sale" | "engagement";
  niche: string;
  days: number;
  product?: string;
  strategy?: "general" | "launch";
  gender?: "female" | "male";
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

const REELS_HOOK_FORMULAS = [
  "Шок-факт: начни с неожиданной статистики или факта",
  "Провокация: заяви что-то спорное, что заставит досмотреть",
  "До/После: покажи контраст результата",
  "Миф/Правда: разбей популярное заблуждение",
  "История клиентки: начни с 'Она пришла ко мне с...'",
  "Вопрос в лоб: 'А ты тоже так делаешь?'",
  "Секрет: 'То, о чём не говорят вслух...'",
  "Ошибка: '3 ошибки, которые совершают 90%...'",
  "Признание: 'Я сама через это прошла...'",
  "Интрига: 'Досмотри до конца, там главное'",
  "Список: 'Топ-5 причин почему...'",
  "Сравнение: 'Раньше я думала X, теперь понимаю Y'",
  "Боль: 'Если ты чувствуешь [боль], это для тебя'",
  "Результат: 'За 2 недели она смогла...'",
  "POV: 'POV: ты наконец-то решилась на [действие]'",
  "Обращение: 'Это видео для тех, кто устал от...'",
  "Триггер: 'Когда он говорит [фраза], а ты...'",
  "Лайфхак: 'Простой способ [результат] за 5 минут'",
  "Предупреждение: 'Никогда не делай это, если хочешь...'",
  "Инсайт: 'Меня осенило, когда клиентка сказала...'",
  "Челлендж: 'Попробуй это прямо сейчас'",
  "Реакция: 'Моя реакция, когда узнала что...'",
  "Разоблачение: 'Правда о [теме], которую скрывают'",
  "Формула: 'Формула [результата] из 3 шагов'",
  "Цитата клиентки: 'Она сказала мне: [цитата]'",
  "Неожиданный поворот: история с сюрпризом в конце",
  "Прямой эфир стиль: говори как будто отвечаешь на вопрос",
  "Мини-урок: обучающий формат с пользой",
  "За кадром: покажи процесс работы",
  "Ответ хейтерам: 'Мне часто говорят [возражение]...'",
  "Тренд: адаптируй популярный формат под тему",
  "Сторителлинг: расскажи историю с моралью",
  "Визуализация: 'Представь что ты уже...'",
  "Дневник: 'День из жизни [специалиста]'",
  "Q&A: ответ на частый вопрос подписчиков",
  "Распаковка: разбор ситуации по шагам",
  "Энергетика: начни с эмоционального состояния",
  "Метафора: объясни сложное через простой образ",
  "Контраст: 'Все говорят X, а на самом деле Y'",
  "Личная история: расскажи свой опыт",
  "Срочность: 'Это нужно услышать прямо сейчас'",
  "Откровение: 'Никогда не рассказывала это публично, но...'",
  "Прогноз: 'Через месяц ты будешь жалеть, если не...'",
  "Тест на себе: 'Проверила на себе и вот что вышло'",
  "Антипример: 'Как делать НЕ надо (на примере клиентки)'",
  "Пошаговка: '3 шага к [результату], которые работают'",
  "Сериал: 'Часть 1: история, которая изменит твой взгляд'",
  "Опровержение: 'Все думают что [миф], но на самом деле...'",
  "Наблюдение за собой: 'Поймала себя на том, что...'",
  "Инструкция: 'Делай это каждое утро и увидишь результат'",
  "Вызов: 'Спорим, ты не знала это о себе?'",
  "Разбор ошибок: 'Почему у тебя не получается [цель]'",
  "Трансформация: 'Была такой, стала другой — вот что изменила'"
];

const STORIES_HOOK_FORMULAS = [
  "Опрос: 'Знакомо тебе это чувство?' с голосованием",
  "Тест: 'Проверь себя — узнаешь ли ты...'",
  "Вопрос дня: открытый вопрос для ответов",
  "Угадайка: 'Как думаешь, что она сделала?'",
  "Слайдер эмоций: 'Насколько это про тебя?'",
  "Викторина: серия вопросов с ответами",
  "Обратный отсчёт: 'Осталось 3 дня до...'",
  "За кулисами: покажи рабочий процесс",
  "До/После: визуальное сравнение",
  "Цитата дня: мотивирующая мысль",
  "Признание: 'Честно? Я тоже через это прошла'",
  "Совет дня: одна практическая рекомендация",
  "Ошибка дня: 'Не делай так, если хочешь...'",
  "Инсайт: короткое озарение из практики",
  "Вопрос-ответ: ответь на вопрос подписчика",
  "Мини-история: серия сторис с развитием",
  "Чек-лист: 'Проверь себя по пунктам'",
  "Лайфхак: быстрый полезный совет",
  "Настроение: 'Сегодня у меня такое утро...'",
  "Анонс: 'Скоро расскажу о...'",
  "Благодарность: 'Спасибо вам за...'",
  "Рефлексия: 'Задумалась сегодня о...'",
  "Провокация: 'А как ты относишься к...'",
  "Секрет: 'Мало кто знает, но...'",
  "Рекомендация: 'Попробуй это на выходных'",
  "Мотивация: 'Напоминаю тебе, что ты...'",
  "Сравнение: 'Что выбираешь: А или Б?'",
  "Реакция: 'Моё лицо, когда клиентка сказала...'",
  "Процесс: 'Показываю как я делаю...'",
  "Результат: 'Вот что получилось у клиентки'",
  "Вдохновение: 'Это фото напомнило мне о...'",
  "Планы: 'На этой неделе хочу...'",
  "Воспоминание: 'Год назад я была в той же ситуации'",
  "Эксперимент: 'Попробовала новый метод и...'",
  "Отзыв: 'Клиентка написала мне вчера...'",
  "Наблюдение: 'Заметила интересную закономерность'",
  "Формат 'это или то': выбор между вариантами",
  "Дневник: 'Мой день сегодня начался с...'",
  "Напоминание: 'Не забудь сегодня...'",
  "Приглашение: 'Приходи на [событие]'",
  "Голосование: 'Помоги мне выбрать — А или Б?'",
  "Разоблачение мифа: 'Все верят в это, но это неправда'",
  "Обратная связь: 'Что вы хотите узнать? Пишите!'",
  "Инсайт клиентки: 'Вчера клиентка сказала фразу, которая...'",
  "Мини-урок: 'Сегодня покажу одну технику за 30 сек'",
  "Ретроспектива: 'Что я поняла за год работы'",
  "Пятничный формат: 'Лёгкий пост на выходные'",
  "Утренняя рутина: 'Моё утро начинается с...'",
  "Личный факт: 'Мало кто знает, но я...'",
  "Прямое обращение: 'Если ты сейчас в [ситуации], читай'",
  "Срочное сообщение: 'Важная информация для тех, кто...'"
];

const CONTENT_STYLES = [
  "разговорный, как подруге",
  "экспертный, но простой",
  "эмоциональный и вдохновляющий",
  "провокационный и дерзкий",
  "тёплый и поддерживающий",
  "прямой и конкретный",
  "с юмором и самоиронией",
  "загадочный и интригующий"
];

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
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

// Fix quotes: replace single quotes and Russian quotes with double quotes in JSON
function fixQuotesInJson(jsonStr: string): string {
  // Replace Russian quotes « » with standard "
  let fixed = jsonStr.replace(/[«»]/g, '"');
  
  // Replace single quotes used as JSON string delimiters
  // Pattern: match property values like 'text' or 'text with "nested" quotes'
  // Be careful not to break apostrophes inside words
  fixed = fixed.replace(/:\s*'([^']*?)'/g, (match, content) => {
    // Escape any double quotes inside the content
    const escaped = content.replace(/"/g, '\\"');
    return `: "${escaped}"`;
  });
  
  // Also fix array values with single quotes
  fixed = fixed.replace(/,\s*'([^']*?)'/g, (match, content) => {
    const escaped = content.replace(/"/g, '\\"');
    return `, "${escaped}"`;
  });
  
  // Fix opening bracket followed by single quote
  fixed = fixed.replace(/\[\s*'([^']*?)'/g, (match, content) => {
    const escaped = content.replace(/"/g, '\\"');
    return `["${escaped}"`;
  });
  
  return fixed;
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Fix quotes (single, Russian) to standard double quotes
  cleaned = fixQuotesInJson(cleaned);
  
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

  const isYandex = getProvider() === "YandexGPT";

  // Viral content rules - based on engagement psychology
  const writingStyleRules = isYandex
    ? `
ГЛАВНОЕ ПРАВИЛО: Первое предложение — КРЮЧОК. Человек должен остановить скролл.
ТОЛЬКО терминология ниши "${niche}". Не смешивай ниши.

ХУКИ (выбирай подходящий):
- Шок: "Почему я больше не даю этот совет клиенткам"
- Узнавание: "Если узнаёшь себя в этом — читай дальше"
- Список: "5 признаков, что пора что-то менять"
- Незавершённая мысль: "Она думала, проблема в муже. Но на консультации выяснилось..."

СТИЛЬ: Короткие предложения (до 12 слов). Живо, эмоционально. Эмодзи — до 3-4. Каждый текст = эмоция + польза + действие.

ЗАПРЕЩЕНО: "Вселенная приготовила", "открой портал", "энергии дня", конкретные годы, скучные начала "Сегодня хочу рассказать..."`
    : `
ГЛАВНОЕ ПРАВИЛО: Первое предложение — КРЮЧОК. Человек должен остановить скролл.

ВАЖНО: Используй ТОЛЬКО терминологию ниши "${niche}". НЕ добавляй элементы из других ниш (таро, астрология, нумерология — если это не указано в нише)!

═══════════════════════════════════════
🔥 ФОРМУЛЫ ВИРУСНЫХ ХУКОВ (адаптируй под нишу "${niche}"):
═══════════════════════════════════════

1. ШОК/КОНТРОВЕРСИЯ:
   "Почему я больше не даю этот совет клиенткам"
   "Я потеряла 50 клиентов за месяц. И это лучшее, что случилось"
   "3 вещи, которые специалисты скрывают от клиентов"

2. УЗНАВАНИЕ СЕБЯ:
   "Если ты узнаёшь себя в этом — читай дальше"
   "Ты делаешь это каждое утро. И теряешь энергию до вечера"
   "90% женщин делают эту ошибку в отношениях"

3. НЕЗАКОНЧЕННАЯ МЫСЛЬ (открытая петля):
   "Она думала, проблема в муже. Но на консультации выяснилось..."
   "Есть одна фраза, которая убивает отношения. Это..."
   "90% людей не знают этого про себя. А это меняет всё"

4. СПИСКИ С ЦИФРАМИ:
   "5 признаков, что пора менять что-то в жизни"
   "3 ошибки, которые делают все"
   "7 фраз, которые разрушают отношения"

5. ПЕРСОНАЛИЗАЦИЯ:
   "Напиши свой вопрос — отвечу"
   "А у тебя так было? Расскажи"
   "Проверь себя — узнаёшь?"

═══════════════════════════════════════
💾 ТРИГГЕРЫ СОХРАНЕНИЙ:
═══════════════════════════════════════
- "Сохрани, чтобы не потерять"
- "Шпаргалка — пригодится"
- "Чеклист — забирай"
- Любые полезные списки, даты, чеклисты

═══════════════════════════════════════
💬 ТРИГГЕРЫ КОММЕНТАРИЕВ:
═══════════════════════════════════════
- Спорные утверждения: "Это самая частая ошибка. Согласны?"
- Выбор: "А ты за или против? Пиши в комменты"
- Личный опыт: "А у тебя так было? Расскажи"
- Угадайки: "Угадай, какой ответ самый популярный?"

═══════════════════════════════════════
📱 СТРУКТУРА РИЛС (15-30 сек):
═══════════════════════════════════════
0-3 сек: ШОК-хук (остановить скролл)
3-20 сек: Раскрытие + польза
20-30 сек: Призыв (подписка/коммент/сохранение)

Примеры хуков для рилс:
"Стоп! Если узнаёшь себя — это для тебя"
"Я узнала это и офигела"
"Никогда не делай этого, если хочешь результат"
"Этот метод работает у 90% моих клиенток"

═══════════════════════════════════════
🚫 ЗАПРЕЩЕНО:
═══════════════════════════════════════
❌ "Вселенная приготовила/послала/показывает" — абстракция
❌ "Энергии дня/месяца" без объяснения что делать
❌ "Открой портал/канал/поток" — пустые слова
❌ Упоминание конкретных годов (2025, 2026) — контент устареет
❌ Скучные начала типа "Сегодня хочу рассказать..."

═══════════════════════════════════════
✅ СТИЛЬ:
═══════════════════════════════════════
- Короткие предложения. Максимум 12 слов.
- Пиши как голосовое подруге — живо, эмоционально
- Эмодзи уместны, но не больше 3-4 на пост
- Вместо года пиши: "в ближайший месяц", "этот период", "скоро"
- Каждый текст = эмоция + польза + действие

═══════════════════════════════════════
🎯 БОЛИ ЦЕЛЕВОЙ АУДИТОРИИ (бей в них!):
═══════════════════════════════════════
Каждая тема должна касаться РЕАЛЬНОЙ проблемы. Генерируй по аналогии, каждый раз НОВЫЕ формулировки:

💔 ОТНОШЕНИЯ (самая горячая тема!):
- "Он не пишет/не звонит — что делать?"
- "Почему все мои отношения заканчиваются одинаково?"
- "Как понять, изменяет ли он?"
- "Вернётся ли бывший?"
- "Почему притягиваю токсичных/женатых/недоступных?"
- "Как отпустить того, кто не отпускает?"

💰 ДЕНЬГИ И РАБОТА:
- "Почему деньги не задерживаются?"
- "Как выйти из финансовой ямы?"
- "Страх больших денег — откуда?"
- "Почему я работаю много, а зарабатываю мало?"
- "Как найти своё дело/призвание?"
- "Боюсь менять работу"

🌟 САМОРЕАЛИЗАЦИЯ:
- "Не знаю, чего хочу от жизни"
- "Застряла на одном месте"
- "Чувствую, что живу не свою жизнь"
- "Страх начать что-то новое"
- "Синдром самозванца"

👨‍👩‍👧 СЕМЬЯ И ДЕТИ:
- "Свекровь/мама лезет в мою жизнь"
- "Муж не понимает/не слышит"
- "Проблемы с ребёнком-подростком"
- "Почему в моём роду все разводятся?"

⚡ ЭНЕРГИЯ И ЗДОРОВЬЕ:
- "Постоянная усталость, нет сил"
- "Чувствую себя выгоревшей"
- "Панические атаки, тревога"
- "Бессонница, плохие сны"

⚠️ ВАЖНО: 
- Каждый раз генерируй НОВЫЕ темы по аналогии с примерами
- Чередуй категории болей (не 5 постов подряд про отношения)
- Формулируй хуки через боль: "Устала от..." / "Почему опять..." / "Как избавиться от..."
- НЕ ПОВТОРЯЙ одни и те же темы — придумывай вариации`;

  // Different system prompts for sale vs engagement
  const saleSystemPrompt = `Ты — SMM-копирайтер для специалистов в нише "${niche}". Твоя суперсила — писать тексты, которые ПРОДАЮТ через вовлечение, а не через давление. СТРОГО используй только терминологию ниши "${niche}", НЕ добавляй элементы из других ниш.
${writingStyleRules}

ТВОЯ ЗАДАЧА: Создать продающий контент-план, где каждый пост сначала ЦЕПЛЯЕТ, потом продаёт.

═══════════════════════════════════════
🎯 СТРАТЕГИЯ МЯГКИХ ПРОДАЖ:
═══════════════════════════════════════
1. ВОВЛЕЧЬ (хук, интрига, узнавание себя)
2. ДАТЬ ПОЛЬЗУ (показать экспертность)
3. МЯГКО ПРОДАТЬ (через историю или кейс)

═══════════════════════════════════════
💰 ПРОДАЮЩИЕ ТЕХНИКИ:
═══════════════════════════════════════
- "Было → Стало": история клиентки с результатом
- FOMO: "Осталось 3 места на этой неделе"
- Социальное доказательство: "Уже 200+ девушек прошли"
- Секретность: "Рассказываю только в личной работе, но..."
- Ограничение: "Беру только 5 клиентов в месяц"

═══════════════════════════════════════
📊 МИКС КОНТЕНТА (соблюдай!):
═══════════════════════════════════════
- 30% Прямые продажи: кейсы, отзывы, "запись открыта"
- 30% Экспертный: польза + мягкое упоминание услуги
- 25% Вовлекающий: тесты, опросы (разогрев аудитории)
- 15% Личные истории: путь, инсайты, закулисье

═══════════════════════════════════════
⚡ В КАЖДОМ ПОСТЕ:
═══════════════════════════════════════
- Хук в первой строке (используй формулы выше!)
- Призыв к действию: конкретный и простой
- Упоминание продукта — естественно, через пользу

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: идея с хуком (цепляющая формулировка!)
- type: тип (Продающий/Экспертный/Личная история/Вовлекающий)
- post: пост для ленты (хук → польза → призыв к покупке)
- carousel: 5-7 слайдов. Первый = интрига. Последний = призыв. Формат "Слайд 1: ..."
- reels: сценарий (шок-хук → польза → призыв записаться)
- stories: 4-5 сторис с воронкой (интерес → польза → оффер)

Формат: ТОЛЬКО JSON массив.
Структура каждого элемента: {"day":1,"idea":"[УНИКАЛЬНАЯ идея на основе ПРОДУКТА]","type":"[тип]","post":{"content":"[текст]"},"carousel":{"content":"Слайд 1: [заголовок]..."},"reels":{"content":"Хук: [3 сек]\\nОснова: [20 сек]\\nПризыв: [действие]"},"stories":{"content":"Сторис 1: [текст]..."}}

ВАЖНО: Используй ТОЛЬКО терминологию ниши "${niche}". НЕ добавляй элементы других ниш!${archetypeInstruction}`;

  const engagementSystemPrompt = `Ты — SMM-копирайтер для специалистов в нише "${niche}". Твоя суперсила — создавать ВИРУСНЫЙ контент, который взрывает охваты. СТРОГО используй только терминологию ниши "${niche}", НЕ добавляй элементы из других ниш.
${writingStyleRules}

ТВОЯ ЗАДАЧА: Создать контент-план, который ВЗОРВЁТ охваты. Каждый пост = потенциальный вирус.

═══════════════════════════════════════
🎯 ЦЕЛИ КАЖДОГО ПОСТА:
═══════════════════════════════════════
1. ОСТАНОВИТЬ скролл (шок-хук в первой строке)
2. УДЕРЖАТЬ до конца (интрига, открытая петля)
3. ВЫЗВАТЬ действие (коммент/сохранение/репост)

═══════════════════════════════════════
📊 МИКС КОНТЕНТА (соблюдай баланс!):
═══════════════════════════════════════
- 40% Вовлекающий: тесты, опросы, угадайки, вопросы в комменты
- 30% Экспертный: лайфхаки, чеклисты, "сохрани себе"
- 20% Личные истории: с неожиданным поворотом
- 10% Развлекательный: мемы про жизненные ситуации, смешные наблюдения

═══════════════════════════════════════
⚡ ОБЯЗАТЕЛЬНО В КАЖДОМ ПОСТЕ:
═══════════════════════════════════════
- Хук в первой строке (см. формулы выше)
- Призыв к действию в конце
- Для карусели: интрига на первом слайде ("Листай до конца!")
- Для рилс: шок в первые 3 секунды

ДЛЯ КАЖДОГО ДНЯ создай:
- idea: идея с хуком (не просто тема, а цепляющая формулировка!)
- type: тип (Вовлекающий/Экспертный/Личная история/Развлекательный)
- post: пост для ленты (хук → раскрытие → призыв)
- carousel: карусель 5-7 слайдов. ПЕРВЫЙ слайд = интрига. Формат "Слайд 1: Заголовок\\nТекст..."
- reels: сценарий (0-3 сек: шок-хук → 3-20 сек: польза → призыв)
- stories: серия 4-5 сторис с опросами/выбором. Формат "Сторис 1: ..."

Формат: ТОЛЬКО JSON массив.
Структура каждого элемента: {"day":1,"idea":"[УНИКАЛЬНАЯ идея — придумай НОВУЮ каждый раз]","type":"[тип]","post":{"content":"[текст]"},"carousel":{"content":"Слайд 1: [заголовок]..."},"reels":{"content":"Хук: [3 сек]\\nОснова: [20 сек]\\nПризыв: [действие]"},"stories":{"content":"Сторис 1: [текст]..."}}

ВАЖНО: Используй ТОЛЬКО терминологию ниши "${niche}". НЕ добавляй элементы других ниш!${archetypeInstruction}`;

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

Ответь ТОЛЬКО JSON массивом.`;

  try {
    console.log("Calling DeepSeek API...");
    const startTime = Date.now();
    
    const response = await getClient().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }, { timeout: 25000 });

    const elapsed = Date.now() - startTime;
    console.log(`DeepSeek API responded in ${elapsed}ms`);

    const content = extractContent(response) || "[]";
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
  gender?: "female" | "male";
  archetype?: {
    name: string;
    description: string;
    recommendations: string[];
    triggerWords?: string[];
    contentStyle?: string[];
    tone?: string;
  };
}

// Content types for single-day generation - separated by goal
const SINGLE_DAY_SALE_TYPES = [
  { type: "Экспертный", description: "полезный совет, чеклист, инструкция — покажи компетентность без продажи" },
  { type: "Закрытие возражения", description: "работа с сомнением 'дорого/не сработает/нет времени'" },
  { type: "Кейс", description: "история клиента с результатом 'было/стало'" },
  { type: "Знакомство", description: "личная история, покажи что понимаешь боль аудитории" },
  { type: "Продающий", description: "мягкий рассказ о продукте через пользу, без давления" },
];

const SINGLE_DAY_ENGAGEMENT_TYPES = [
  { type: "Экспертный", description: "полезные советы, чеклисты, инструкции" },
  { type: "Личная история", description: "откровения, опыт, история трансформации" },
  { type: "Вовлекающий", description: "вопросы аудитории, опросы, обсуждения" },
  { type: "Развлекательный", description: "лёгкий контент, юмор, мемы по теме ниши" },
];

// Marketing funnel structure for product launch warmup
function getWarmupStructure(days: number, goal?: "sale" | "engagement"): string {
  // Special handling for 1 day - random content type based on goal
  if (days === 1) {
    const types = goal === "sale" ? SINGLE_DAY_SALE_TYPES : SINGLE_DAY_ENGAGEMENT_TYPES;
    const randomType = types[Math.floor(Math.random() * types.length)];
    return `
═══════════════════════════════════════
📅 ЗАДАНИЕ НА СЕГОДНЯ (1 ДЕНЬ):
═══════════════════════════════════════
Создай ТОЛЬКО 1 пост на сегодня!

🎯 ТИП КОНТЕНТА: ${randomType.type}
📝 Описание: ${randomType.description}

⚠️ ВАЖНО: Создай ровно 1 идею для 1 дня. НЕ создавай контент на несколько дней!`;
  }
  
  if (days <= 7) {
    return `
═══════════════════════════════════════
📅 СТРУКТУРА ПРОГРЕВА НА ${days} ДНЕЙ:
═══════════════════════════════════════
День 1: ЗНАКОМСТВО + БОЛЬ — расскажи личную историю, покажи что понимаешь боль аудитории
День 2: ЭКСПЕРТНЫЙ — дай пользу, покажи компетентность без продажи
День 3: ЗАКРЫТИЕ ВОЗРАЖЕНИЯ "дорого/нет денег" — объясни ценность vs цена
День 4: КЕЙС/ОТЗЫВ — история клиентки с результатом
День 5: ЗАКРЫТИЕ ВОЗРАЖЕНИЯ "не сработает у меня" — покажи что метод универсален
День 6: ПРОДАЮЩИЙ МЯГКИЙ — расскажи о продукте через пользу
День 7: ПРОДАЮЩИЙ + ДЕДЛАЙН — последний шанс, срочность`;
  }
  
  return `
═══════════════════════════════════════
📅 СТРУКТУРА ПРОГРЕВА НА ${days} ДНЕЙ:
═══════════════════════════════════════

🔹 ДНИ 1-3: ЗНАКОМСТВО + БОЛИ АУДИТОРИИ
- День 1: Личная история — почему ты занимаешься этим, через какую боль прошла сама
- День 2: Главная боль аудитории — покажи что понимаешь их проблему изнутри  
- День 3: Вторая боль — ещё одна проблема, которую решает твой продукт

🔹 ДНИ 4-6: ЭКСПЕРТНЫЙ КОНТЕНТ
- День 4: Полезный чеклист/инструкция — дай реальную пользу бесплатно
- День 5: Разбор ошибок — что делают неправильно и к чему это приводит
- День 6: Лайфхак/метод — покажи часть своей методики

🔹 ДНИ 7-9: ЗАКРЫТИЕ ВОЗРАЖЕНИЙ  
- День 7: "Дорого/нет денег" — покажи цену бездействия, ROI от решения
- День 8: "Не сработает у меня" — докажи универсальность через разные примеры
- День 9: "Нет времени" — покажи быстрые результаты, минимум усилий

🔹 ДНИ 10-12: СОЦИАЛЬНЫЕ ДОКАЗАТЕЛЬСТВА
- День 10: Кейс клиентки #1 — история "было/стало" с деталями
- День 11: Кейс клиентки #2 — другой типаж, другая ситуация
- День 12: Подборка отзывов/скриншотов — массовое подтверждение

🔹 ДНИ 13-14: ПРОДАЖА + ДЕДЛАЙН
- День 13: Мягкая продажа — расскажи подробно о продукте, для кого он
- День 14: Жёсткий дедлайн — последний день, срочность, что потеряют`;
}

// Common objections to close in content
const COMMON_OBJECTIONS = [
  { objection: "дорого/нет денег", closing: "Покажи цену бездействия: сколько стоит оставаться в этой ситуации ещё год? Дели сумму на дни. Сравни с ежедневными тратами на кофе/такси." },
  { objection: "не сработает у меня", closing: "Приведи примеры разных клиенток: разный возраст, ситуации, уровень. Покажи что метод работает независимо от обстоятельств." },
  { objection: "нет времени", closing: "Покажи минимум времени на результат. Сколько минут в день? Можно ли совмещать с обычной жизнью?" },
  { objection: "надо подумать", closing: "Объясни что 'подумать' = отложить решение навсегда. Что изменится через неделю размышлений?" },
  { objection: "у меня особая ситуация", closing: "Расскажи о клиентке с 'особой ситуацией' которая тоже так думала. Что оказалось на самом деле?" },
  { objection: "уже пробовала, не помогло", closing: "Объясни чем твой подход отличается. Почему другие методы не сработали, а этот сработает?" },
  { objection: "муж/семья не поддержит", closing: "История клиентки которая начала тайно, а потом семья увидела результат и поддержала." },
  { objection: "страшно/не уверена", closing: "Нормализуй страх. Расскажи про свой страх когда начинала. Что помогло решиться?" }
];

// Different content presentation formats
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

// Step 1: Generate only ideas (fast, ~10-20 seconds)
export async function generateIdeasOnly(input: ContentGenerationInput): Promise<ContentIdea[]> {
  const { goal, niche, days, product, strategy, archetype } = input;
  
  const archetypeInstruction = archetype 
    ? `\n\nАрхетип бренда: ${archetype.name}. ${archetype.description}`
    : "";

  // Random seed for variety - each generation is unique
  const randomSeed = Math.floor(Math.random() * 1000000);
  
  // Get warmup structure based on days
  const warmupStructure = getWarmupStructure(days, goal);
  
  // Select random objections to close
  const shuffledObjections = [...COMMON_OBJECTIONS].sort(() => Math.random() - 0.5);
  const selectedObjections = shuffledObjections.slice(0, 3);
  
  // Select random presentation formats
  const shuffledFormats = [...PRESENTATION_FORMATS].sort(() => Math.random() - 0.5);
  const selectedFormats = shuffledFormats.slice(0, 5).join(", ");

  // Format objections for prompt
  const objectionsText = selectedObjections.map((o, i) => 
    `${i + 1}. "${o.objection}" — ${o.closing}`
  ).join('\n');

  const isYandexIdeas = getProvider() === "YandexGPT";

  const systemPrompt = isYandexIdeas
    ? `Ты — маркетолог-стратег по прогревам продуктов. SEED: ${randomSeed}
${warmupStructure}

ТИПЫ КОНТЕНТА: Знакомство/Боль, Экспертный, Закрытие возражения, Кейс/Отзыв, Продающий мягкий, Продающий дедлайн.
ФОРМАТЫ ПОДАЧИ (чередуй): ${selectedFormats}
ВОЗРАЖЕНИЯ ДЛЯ ЗАКРЫТИЯ: ${objectionsText.replace(/\n/g, "; ")}

ЗАПРЕЩЕНО: однотипные темы подряд, элементы из ДРУГИХ ниш.
СТРОГО терминология ниши "${niche}"${archetypeInstruction}`
    : `Ты — маркетолог-стратег, специалист по ПРОГРЕВАМ И ЗАПУСКАМ продуктов. Ты создаёшь контент-план для ПРОГРЕВА к продукту.

🎲 SEED: ${randomSeed}
${warmupStructure}

═══════════════════════════════════════
🎯 ТИПЫ КОНТЕНТА ДЛЯ ПРОГРЕВА:
═══════════════════════════════════════

📌 ЗНАКОМСТВО/БОЛЬ — личная история, понимание проблемы аудитории
📌 ЭКСПЕРТНЫЙ — полезный контент без продажи, чеклисты, инструкции  
📌 ЗАКРЫТИЕ ВОЗРАЖЕНИЯ — работа с конкретным возражением
📌 КЕЙС/ОТЗЫВ — история клиентки с результатом "было/стало"
📌 ПРОДАЮЩИЙ МЯГКИЙ — рассказ о продукте через пользу
📌 ПРОДАЮЩИЙ ДЕДЛАЙН — срочность, последний шанс

═══════════════════════════════════════
💡 ФОРМАТЫ ПОДАЧИ (чередуй!):
═══════════════════════════════════════
${selectedFormats}

═══════════════════════════════════════
🚫 ВОЗРАЖЕНИЯ ДЛЯ ЗАКРЫТИЯ:
═══════════════════════════════════════
${objectionsText}

⛔ ЗАПРЕЩЕНО:
- Однотипные темы подряд
- Только продающий контент
- Абстрактные формулировки
- Элементы из ДРУГИХ ниш

✅ ОБЯЗАТЕЛЬНО:
- Разные типы контента по дням (см. структуру выше)
- Конкретные боли и ситуации
- Прогрессия от знакомства к продаже
- СТРОГО терминология ниши "${niche}"${archetypeInstruction}`;

  const userPrompt = goal === "sale"
    ? `SEED: ${randomSeed}

Создай ПРОГРЕВАЮЩИЙ контент-план на ${days} дней для запуска продукта.
НИША: ${niche}
ПРОДУКТ: "${product || 'консультация'}"

${isYandexIdeas ? "" : `⚡ КРИТИЧЕСКИ ВАЖНО — СЛЕДУЙ СТРУКТУРЕ ПРОГРЕВА:\n${warmupStructure}\n\nКаждый день должен иметь СВОЙ тип контента по структуре!
День 1 ≠ День 7 ≠ День 14 — это РАЗНЫЕ этапы воронки!`}

ИДЕЯ — это КОРОТКИЙ заголовок темы (максимум одно предложение, до 10 слов).
НЕ добавляй пояснения, описание формата, закрытие боли — только название темы.
Пример ПРАВИЛЬНО: "Как правильно сформулировать вопрос для расклада Таро"
Пример НЕПРАВИЛЬНО: "Тема: 3 шага... Закрывает боль... Формат подачи: чеклист..."

ПРОДУКТ — это "${product || 'консультация'}". Темы постов должны вести к этому конкретному продукту, не к другим форматам работы.

Для каждого дня:
- day: номер
- idea: короткое название темы (1 предложение, до 10 слов)
- type: тип по структуре (Знакомство/Экспертный/Закрытие возражения/Кейс/Продающий)

Ответь ТОЛЬКО валидным JSON:
{"ideas": [{"day":1,"idea":"короткое название темы","type":"тип"}]}`
    : `SEED: ${randomSeed}

Создай контент-план на ${days} дней для ВОВЛЕЧЕНИЯ аудитории.
НИША: ${niche}

ТИПЫ КОНТЕНТА (чередуй!):
- Экспертный — полезные советы, чеклисты
- Личная история — откровения, опыт
- Вовлекающий — вопросы, опросы, обсуждения
- Развлекательный — лёгкий контент, юмор

ИДЕЯ — это КОРОТКИЙ заголовок темы (максимум одно предложение, до 10 слов).
НЕ добавляй пояснения, описание формата — только название темы.
Пример ПРАВИЛЬНО: "Как подготовиться к первому раскладу Таро"
Пример НЕПРАВИЛЬНО: "Тема: 3 шага... Какую эмоцию вызывает... Формат подачи..."

Для каждого дня:
- day: номер
- idea: короткое название темы (1 предложение, до 10 слов)
- type: тип (Экспертный/Личная история/Вовлекающий/Развлекательный)

Ответь ТОЛЬКО валидным JSON:
{"ideas": [{"day":1,"idea":"короткое название темы","type":"тип"}]}`;

  const maxRetries = 2;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generating ideas only (attempt ${attempt}/${maxRetries})...`);
      const startTime = Date.now();
      
      const response = await getClient().chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.0,
        max_tokens: 8000,
        response_format: { type: "json_object" },
      }, { timeout: 25000 });

      const elapsed = Date.now() - startTime;
      console.log(`Ideas generated in ${elapsed}ms`);

      const content = extractContent(response) || "{}";
      console.log("Raw AI response (first 500 chars):", content.substring(0, 500));
      
      try {
        const cleaned = cleanJsonResponse(content);
        const parsed = JSON.parse(cleaned);
        
        // Handle both formats: { ideas: [...] } or direct array [...]
        if (parsed.ideas && Array.isArray(parsed.ideas)) {
          return parsed.ideas as ContentIdea[];
        } else if (Array.isArray(parsed)) {
          return parsed as ContentIdea[];
        } else {
          // Try to find array in response
          const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as ContentIdea[];
          }
          throw new Error("No ideas array found in response");
        }
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError.message);
        console.error("Response content:", content.substring(0, 300));
        throw new Error(`JSON parse failed: ${parseError.message}`);
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Ideas generation error (attempt ${attempt}):`, error?.message || error);
      
      if (attempt < maxRetries) {
        console.log("Retrying in 1 second...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.error("All retry attempts failed");
  sendErrorNotification(
    "ContentGenerator:generateIdeas",
    lastError?.message || "Unknown error",
    "Все попытки генерации идей завершились неудачей"
  ).catch(() => {});
  throw new Error("Сервис временно недоступен. Пожалуйста, попробуйте через 5 минут.");
}

// Step 2: Generate single format content (on demand)
export async function generateSingleFormat(input: SingleFormatInput): Promise<FormatContent> {
  const { goal, niche, product, idea, type, format, gender, archetype } = input;
  
  const genderInstruction = gender === "male" 
    ? "\n\nВАЖНО: Пиши от МУЖСКОГО рода. Автор — мужчина. Используй мужские окончания: я сделал, я понял, я рассказал."
    : "\n\nВАЖНО: Пиши от ЖЕНСКОГО рода. Автор — женщина. Используй женские окончания: я сделала, я поняла, я рассказала.";
  
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
ГЛАВНОЕ: Первое предложение должно ОСТАНОВИТЬ скролл. Зацепить эмоционально.

ЧЕКЛИСТ:
✓ Начни с КОНКРЕТНОЙ боли или ситуации клиентки
✓ Раскрой тему ПОДРОБНО — с примерами, историями, деталями
✓ Дай КОНКРЕТНУЮ пользу или инсайт
✓ Призыв — что ИМЕННО сделать

ЗАПРЕЩЕНО:
❌ Короткие отписки в 2-3 предложения
❌ Абстракции без конкретики
❌ Пустые обещания без примеров
❌ Элементы из ДРУГИХ ниш (если клиент — психолог, НЕ пиши про таро/карты/астрологию!)

СТИЛЬ: Живой разговорный язык. Как подруге за чаем. Можно длинные предложения если они читаются легко.`;

  const selectedReelsHooks = getRandomElements(REELS_HOOK_FORMULAS, 6);
  const selectedStoriesHooks = getRandomElements(STORIES_HOOK_FORMULAS, 6);
  const selectedReelsStyle = getRandomElements(CONTENT_STYLES, 1)[0];
  const selectedStoriesStyle = getRandomElements(CONTENT_STYLES, 1)[0];

  const formatInstructions: Record<string, string> = {
    post: `Напиши РАЗВЁРНУТЫЙ ПОСТ для Instagram.

⚠️ ОБЯЗАТЕЛЬНАЯ ДЛИНА: 1000-1500 символов (это 5-7 абзацев!)
Короткие посты в 2-3 предложения — ЗАПРЕЩЕНЫ!

${writingRules}

СТРУКТУРА РАЗВЁРНУТОГО ПОСТА:
1. ХУК (1-2 предложения) — зацепи внимание, останови скролл
2. ИСТОРИЯ/СИТУАЦИЯ (2-3 абзаца) — раскрой тему через историю или конкретный пример
3. ИНСАЙТ/ПОЛЬЗА (1-2 абзаца) — дай ценность, покажи решение
4. ПРИЗЫВ (1-2 предложения) — что сделать дальше

ПРИМЕР ОБЪЁМА (минимум такой длины!):
"Она написала мне в 2 часа ночи: 'Я больше не могу так жить'.

За 3 года отношений она потеряла себя. Перестала видеться с подругами, забросила хобби, даже причёску не меняла — боялась его реакции.

Знакомо? Это называется созависимость. Когда твоя жизнь вращается вокруг другого человека, а ты забываешь, кто ты без него.

Я прошла через это сама. И знаю — выход есть. Но первый шаг — признать проблему...

[продолжение поста с пользой и призывом]"`,

    carousel: `Напиши КАРУСЕЛЬ из 5-7 слайдов.
${writingRules}

ФОРМАТ ОБЯЗАТЕЛЕН:
Первый слайд — крупный заголовок (хук, зацепить листать)
Затем каждый новый слайд отделяй символами ---
Последний слайд — призыв к действию

СТРУКТУРА (придумай СВОЮ тему на основе ниши "${niche}" и идеи):
[Заголовок-хук на первом слайде]

---

[Пункт 1: раскрытие темы]

---

[Пункт 2: продолжение]

---

[Призыв к действию]`,

    reels: `Напиши СЦЕНАРИЙ для Reels/видео.
${writingRules}

ВЫБЕРИ ОДИН ИЗ ЭТИХ ФОРМАТОВ для хука (используй СЛУЧАЙНО выбранный!):
${selectedReelsHooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}

СТИЛЬ ПОДАЧИ (выбран случайно): ${selectedReelsStyle}

Структура:
'Хук: [первые 3 сек — УНИКАЛЬНЫЙ, не повторяй шаблоны!]
Основа: [главная мысль, 20-30 сек]
Призыв: [что сделать]'

⚠️ ЗАПРЕЩЕНО: использовать одинаковые структуры! Каждый reels должен быть УНИКАЛЬНЫМ.
Говори от первого лица. Как будто снимаешь сама.`,

    stories: `Напиши серию из 4-5 СТОРИС.
${writingRules}

ВЫБЕРИ ОДИН ИЗ ЭТИХ ФОРМАТОВ для серии (используй СЛУЧАЙНО выбранный!):
${selectedStoriesHooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}

СТИЛЬ ПОДАЧИ (выбран случайно): ${selectedStoriesStyle}

Формат:
'Сторис 1: [текст или описание]
Сторис 2: [следующий слайд]...'

⚠️ ЗАПРЕЩЕНО: повторять одни и те же структуры! Каждая серия УНИКАЛЬНА.
Сторис 1 — зацепить (вопрос, интрига, НО каждый раз по-разному!)
Последняя — призыв к действию`
  };

  const callToAction = goal === "sale" 
    ? `Мягко подведи к продукту "${product || 'консультация'}". Без давления, через пользу.`
    : "Попроси комментарий, реакцию или сохранение — естественно, не навязчиво.";

  const systemPrompt = `Ты — копирайтер для специалистов в нише "${niche}". Пишешь живым языком, как подруга подруге. Никакого официоза. СТРОГО используй только терминологию ниши "${niche}", НЕ добавляй элементы из других ниш (таро, астрология, нумерология и т.д. если это не указано в нише).${genderInstruction}${archetypeInstruction}`;

  const randomSeed = Math.random().toString(36).substring(2, 10);

  const userPrompt = `SEED: ${randomSeed} (используй для рандомизации подхода!)

${formatInstructions[format]}

НИША: ${niche}
ТИП: ${type}
ИДЕЯ: ${idea}
${callToAction}

⚠️ КРИТИЧЕСКИ ВАЖНО: Придумай ПОЛНОСТЬЮ УНИКАЛЬНУЮ подачу! Не копируй шаблонные структуры!

Ответь ТОЛЬКО валидным JSON объектом в формате:
{"content": "готовый текст"}`;

  const maxRetries = 2;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generating ${format} for idea: ${idea.substring(0, 50)}... (attempt ${attempt}/${maxRetries})`);
      const startTime = Date.now();
      
      const response = await getClient().chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.0,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }, { timeout: 25000 });

      const elapsed = Date.now() - startTime;
      console.log(`${format} generated in ${elapsed}ms`);

      const content = extractContent(response) || "{}";
      console.log(`Raw ${format} response (first 300 chars):`, content.substring(0, 300));
      
      try {
        const parsed = JSON.parse(content);
        
        // Ensure we have the expected structure
        if (parsed.content) {
          return parsed as FormatContent;
        } else {
          // Try to extract from nested structure
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as FormatContent;
          }
          throw new Error("No content field found in response");
        }
      } catch (parseError: any) {
        console.error(`${format} JSON parse error:`, parseError.message);
        console.error("Response content:", content.substring(0, 300));
        throw new Error(`JSON parse failed: ${parseError.message}`);
      }
    } catch (error: any) {
      lastError = error;
      console.error(`${format} generation error (attempt ${attempt}):`, error?.message || error);
      
      if (attempt < maxRetries) {
        console.log("Retrying in 1 second...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.error(`All ${format} retry attempts failed`);
  sendErrorNotification(
    `ContentGenerator:${format}`,
    lastError?.message || "Unknown error",
    `Все попытки генерации формата "${format}" завершились неудачей`
  ).catch(() => {});
  throw new Error("Сервис временно недоступен. Пожалуйста, попробуйте через 5 минут.");
}

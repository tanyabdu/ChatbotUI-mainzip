export interface LunarPhase {
  date: string;
  type: "new" | "first_quarter" | "full" | "last_quarter";
  time: string;
}

export interface MoonDayData {
  day: number;
  phase: string;
  zodiac: string;
  description: string;
  good: string[];
  bad: string[];
  contentRecommendation: string;
}

export const LUNAR_PHASES_2026: LunarPhase[] = [
  { date: "2026-01-03", type: "full", time: "00:02" },
  { date: "2026-01-10", type: "last_quarter", time: "15:48" },
  { date: "2026-01-18", type: "new", time: "19:51" },
  { date: "2026-01-25", type: "first_quarter", time: "21:48" },
  { date: "2026-02-01", type: "full", time: "21:09" },
  { date: "2026-02-09", type: "last_quarter", time: "12:43" },
  { date: "2026-02-17", type: "new", time: "12:01" },
  { date: "2026-02-24", type: "first_quarter", time: "09:28" },
  { date: "2026-03-03", type: "full", time: "11:37" },
  { date: "2026-03-11", type: "last_quarter", time: "06:38" },
  { date: "2026-03-19", type: "new", time: "01:23" },
  { date: "2026-03-25", type: "first_quarter", time: "19:17" },
  { date: "2026-04-02", type: "full", time: "00:12" },
  { date: "2026-04-09", type: "last_quarter", time: "21:51" },
  { date: "2026-04-17", type: "new", time: "11:52" },
  { date: "2026-04-24", type: "first_quarter", time: "03:32" },
  { date: "2026-05-01", type: "full", time: "10:23" },
  { date: "2026-05-09", type: "last_quarter", time: "10:10" },
  { date: "2026-05-16", type: "new", time: "20:01" },
  { date: "2026-05-23", type: "first_quarter", time: "11:11" },
  { date: "2026-05-31", type: "full", time: "08:45" },
  { date: "2026-06-07", type: "last_quarter", time: "20:00" },
  { date: "2026-06-15", type: "new", time: "02:54" },
  { date: "2026-06-21", type: "first_quarter", time: "19:55" },
  { date: "2026-06-29", type: "full", time: "21:57" },
  { date: "2026-07-07", type: "last_quarter", time: "04:29" },
  { date: "2026-07-14", type: "new", time: "09:43" },
  { date: "2026-07-21", type: "first_quarter", time: "06:06" },
  { date: "2026-07-29", type: "full", time: "10:35" },
  { date: "2026-08-05", type: "last_quarter", time: "12:21" },
  { date: "2026-08-12", type: "new", time: "17:36" },
  { date: "2026-08-19", type: "first_quarter", time: "18:46" },
  { date: "2026-08-28", type: "full", time: "01:18" },
  { date: "2026-09-03", type: "last_quarter", time: "20:37" },
  { date: "2026-09-11", type: "new", time: "03:27" },
  { date: "2026-09-18", type: "first_quarter", time: "09:43" },
  { date: "2026-09-26", type: "full", time: "16:49" },
  { date: "2026-10-03", type: "last_quarter", time: "06:25" },
  { date: "2026-10-10", type: "new", time: "15:50" },
  { date: "2026-10-18", type: "first_quarter", time: "02:12" },
  { date: "2026-10-26", type: "full", time: "07:12" },
  { date: "2026-11-01", type: "last_quarter", time: "18:28" },
  { date: "2026-11-09", type: "new", time: "07:02" },
  { date: "2026-11-16", type: "first_quarter", time: "19:00" },
  { date: "2026-11-24", type: "full", time: "19:53" },
  { date: "2026-12-01", type: "last_quarter", time: "09:08" },
  { date: "2026-12-09", type: "new", time: "00:51" },
  { date: "2026-12-16", type: "first_quarter", time: "10:42" },
  { date: "2026-12-24", type: "full", time: "06:28" },
  { date: "2026-12-31", type: "last_quarter", time: "02:59" },
];

export const ECLIPSES_2026 = [
  {
    date: "2026-02-17",
    type: "solar_annular",
    description: "Кольцеобразное солнечное затмение",
    visibility: "Антарктида, южная часть Атлантического и Индийского океанов",
    magnitude: 0.963,
  },
  {
    date: "2026-03-03",
    type: "lunar_total",
    description: "Полное лунное затмение",
    visibility: "Европа, Африка, Азия, Австралия",
    magnitude: 1.151,
  },
  {
    date: "2026-08-12",
    type: "solar_total",
    description: "Полное солнечное затмение",
    visibility: "Арктика, Гренландия, Исландия, Испания, Португалия",
    magnitude: 1.039,
  },
  {
    date: "2026-08-28",
    type: "lunar_partial",
    description: "Частное лунное затмение",
    visibility: "Америка, Европа, Африка, Азия",
    magnitude: 0.930,
  },
];

export const SEASONS_2026 = {
  spring: { date: "2026-03-20", time: "14:46", description: "Весеннее равноденствие" },
  summer: { date: "2026-06-21", time: "08:25", description: "Летнее солнцестояние" },
  autumn: { date: "2026-09-23", time: "00:06", description: "Осеннее равноденствие" },
  winter: { date: "2026-12-21", time: "20:50", description: "Зимнее солнцестояние" },
};

export const ZODIAC_SIGNS = [
  { name: "Овен", element: "Огонь", quality: "Кардинальный", start: 0, end: 30 },
  { name: "Телец", element: "Земля", quality: "Фиксированный", start: 30, end: 60 },
  { name: "Близнецы", element: "Воздух", quality: "Мутабельный", start: 60, end: 90 },
  { name: "Рак", element: "Вода", quality: "Кардинальный", start: 90, end: 120 },
  { name: "Лев", element: "Огонь", quality: "Фиксированный", start: 120, end: 150 },
  { name: "Дева", element: "Земля", quality: "Мутабельный", start: 150, end: 180 },
  { name: "Весы", element: "Воздух", quality: "Кардинальный", start: 180, end: 210 },
  { name: "Скорпион", element: "Вода", quality: "Фиксированный", start: 210, end: 240 },
  { name: "Стрелец", element: "Огонь", quality: "Мутабельный", start: 240, end: 270 },
  { name: "Козерог", element: "Земля", quality: "Кардинальный", start: 270, end: 300 },
  { name: "Водолей", element: "Воздух", quality: "Фиксированный", start: 300, end: 330 },
  { name: "Рыбы", element: "Вода", quality: "Мутабельный", start: 330, end: 360 },
];

const LUNAR_DAY_MEANINGS: Record<number, { description: string; good: string[]; bad: string[]; content: string }> = {
  1: {
    description: "День новых начинаний. Идеальное время для постановки целей и намерений. Энергия зарождения нового цикла.",
    good: ["Планирование", "Постановка целей", "Медитация", "Визуализация желаний"],
    bad: ["Активные продажи", "Крупные сделки", "Публичные выступления"],
    content: "Анонсируйте новые проекты, делитесь планами и вдохновляющими идеями",
  },
  2: {
    description: "День накопления энергии. Хорошо для сбора информации и подготовки к действиям.",
    good: ["Исследование рынка", "Сбор материалов", "Обучение", "Подготовка контента"],
    bad: ["Импульсивные решения", "Крупные траты"],
    content: "Образовательный контент, полезные подборки, ответы на вопросы подписчиков",
  },
  3: {
    description: "День активных действий. Луна набирает силу, самое время проявлять инициативу.",
    good: ["Активные продажи", "Переговоры", "Запуск рекламы", "Привлечение клиентов"],
    bad: ["Пассивное ожидание", "Откладывание дел"],
    content: "Продающий контент, офферы, призывы к действию",
  },
  4: {
    description: "День противоречий. Требует осторожности в словах и решениях.",
    good: ["Анализ результатов", "Работа над ошибками", "Личная рефлексия"],
    bad: ["Конфликтные переговоры", "Рискованные решения", "Критика"],
    content: "Личные истории преодоления, мягкий сторителлинг",
  },
  5: {
    description: "День верности своему пути. Хорош для укрепления ценностей и принципов.",
    good: ["Работа над брендом", "Укрепление позиционирования", "Контент о ценностях"],
    bad: ["Измена своим принципам", "Компромиссы в важном"],
    content: "Контент о ценностях, миссии, экспертности",
  },
  6: {
    description: "День интуиции и предвидения. Отлично работает творческая энергия.",
    good: ["Создание контента", "Творческие проекты", "Работа с интуицией"],
    bad: ["Рациональный анализ", "Сухая статистика"],
    content: "Творческий, вдохновляющий контент, прогнозы, видения",
  },
  7: {
    description: "День силы слова. Все сказанное имеет особую силу и влияние.",
    good: ["Переговоры", "Публичные выступления", "Важные разговоры", "Продажи"],
    bad: ["Пустые обещания", "Ложь", "Сплетни"],
    content: "Сильные тексты, манифесты, важные объявления",
  },
  8: {
    description: "День трансформации. Благоприятен для перемен и обновлений.",
    good: ["Ребрендинг", "Обновление стратегии", "Трансформационный контент"],
    bad: ["Цепляние за старое", "Страх перемен"],
    content: "Истории трансформации, кейсы изменений, новые форматы",
  },
  9: {
    description: "Сложный день с тяжелой энергетикой. Требует осторожности.",
    good: ["Очищение", "Избавление от лишнего", "Тихая работа"],
    bad: ["Новые начинания", "Публичность", "Активные продажи"],
    content: "Легкий развлекательный контент или пауза в публикациях",
  },
  10: {
    description: "День семьи и рода. Связь с корнями и традициями.",
    good: ["Семейные темы", "История бренда", "Благодарность клиентам"],
    bad: ["Отрыв от корней", "Забвение истоков"],
    content: "Личные истории, благодарности, семейные ценности в бизнесе",
  },
  11: {
    description: "Мощный энергетический день. Один из самых сильных лунных дней.",
    good: ["Важные решения", "Крупные проекты", "Продажи высокого чека", "Запуски"],
    bad: ["Трусость", "Избегание ответственности"],
    content: "Сильный продающий контент, запуски, важные анонсы",
  },
  12: {
    description: "День милосердия и помощи. Благоприятен для бескорыстных действий.",
    good: ["Бесплатный контент", "Помощь подписчикам", "Благотворительность"],
    bad: ["Эгоизм", "Жадность", "Агрессивные продажи"],
    content: "Полезный бесплатный контент, ответы на вопросы, помощь",
  },
  13: {
    description: "День обучения и передачи знаний. Благоприятен для учебы.",
    good: ["Обучающий контент", "Мастер-классы", "Курсы", "Наставничество"],
    bad: ["Игнорирование знаний", "Высокомерие"],
    content: "Обучающие материалы, полезные инструкции, экспертные статьи",
  },
  14: {
    description: "День силы и действия. Мощная энергия для достижения целей.",
    good: ["Активные продажи", "Важные переговоры", "Спортивные метафоры"],
    bad: ["Лень", "Апатия", "Бездействие"],
    content: "Мотивационный контент, призывы к действию, результаты клиентов",
  },
  15: {
    description: "Полнолуние. Пик лунной энергии. День эмоций и кульминаций.",
    good: ["Завершение проектов", "Подведение итогов", "Эмоциональный контент"],
    bad: ["Новые начинания", "Холодный расчет"],
    content: "Эмоциональные истории, итоги, благодарности, яркий визуал",
  },
  16: {
    description: "День после полнолуния. Время для осмысления и рефлексии.",
    good: ["Анализ результатов", "Сбор отзывов", "Планирование следующего цикла"],
    bad: ["Новые запуски", "Импульсивные действия"],
    content: "Отзывы клиентов, итоги запусков, благодарности",
  },
  17: {
    description: "День женской энергии и творчества. Благоприятен для красоты.",
    good: ["Эстетический контент", "Работа с женской аудиторией", "Красота"],
    bad: ["Грубость", "Агрессия", "Пренебрежение эстетикой"],
    content: "Красивый визуал, женские темы, эстетика, нежность",
  },
  18: {
    description: "День честности с собой. Время для правды и искренности.",
    good: ["Честный контент", "Признание ошибок", "Искренние истории"],
    bad: ["Самообман", "Ложь", "Притворство"],
    content: "Искренние личные истории, признания, честный взгляд на бизнес",
  },
  19: {
    description: "Сложный день с тяжелой энергетикой. Осторожность в словах.",
    good: ["Тихая работа", "Завершение старых дел", "Уединение"],
    bad: ["Конфликты", "Споры", "Агрессивный маркетинг"],
    content: "Нейтральный контент или пауза, мягкие темы",
  },
  20: {
    description: "День духовного роста и преодоления. Сила воли.",
    good: ["Мотивационный контент", "Истории преодоления", "Сложные темы"],
    bad: ["Слабость", "Жалобы", "Нытье"],
    content: "Истории успеха, преодоление трудностей, мотивация",
  },
  21: {
    description: "День справедливости и честности. Благоприятен для правды.",
    good: ["Честные отзывы", "Справедливые цены", "Открытость"],
    bad: ["Обман", "Манипуляции", "Несправедливость"],
    content: "Честные обзоры, открытость о процессах, справедливые предложения",
  },
  22: {
    description: "День мудрости и знаний. Отлично для обучения.",
    good: ["Экспертный контент", "Глубокие темы", "Обучение"],
    bad: ["Поверхностность", "Невежество"],
    content: "Глубокий экспертный контент, аналитика, исследования",
  },
  23: {
    description: "День активной защиты. Осторожность в действиях.",
    good: ["Защита границ", "Работа с возражениями", "Укрепление позиций"],
    bad: ["Агрессия", "Нападение", "Провокации"],
    content: "Контент о границах, ценностях, позиционировании",
  },
  24: {
    description: "День пробуждения творческой энергии. Креатив.",
    good: ["Творческие проекты", "Новые форматы", "Эксперименты"],
    bad: ["Шаблонность", "Скука", "Рутина"],
    content: "Креативный контент, новые форматы, эксперименты",
  },
  25: {
    description: "День созерцания и пассивности. Лучше наблюдать.",
    good: ["Анализ", "Наблюдение", "Сбор информации"],
    bad: ["Активные действия", "Важные решения"],
    content: "Легкий контент, опросы, вопросы аудитории",
  },
  26: {
    description: "День аскезы и ограничений. Время для минимализма.",
    good: ["Чистка контента", "Удаление лишнего", "Простота"],
    bad: ["Избыток", "Перегрузка", "Чрезмерность"],
    content: "Минималистичный контент, простые истины, очищение",
  },
  27: {
    description: "День тайных знаний и интуиции. Мистическая энергия.",
    good: ["Интуитивные решения", "Эзотерический контент", "Глубина"],
    bad: ["Рациональность", "Материализм"],
    content: "Мистический контент, интуитивные инсайты, глубокие смыслы",
  },
  28: {
    description: "День гармонии и завершения цикла. Подготовка к новому.",
    good: ["Подведение итогов", "Благодарность", "Завершение проектов"],
    bad: ["Новые начинания", "Спешка"],
    content: "Итоги месяца, благодарности, подготовка к новому циклу",
  },
  29: {
    description: "Темный день перед новолунием. Время тишины.",
    good: ["Отдых", "Медитация", "Планирование в тишине"],
    bad: ["Активные действия", "Продажи", "Публичность"],
    content: "Минимум публикаций или пауза, тихий контент",
  },
  30: {
    description: "Редкий 30-й лунный день. День завершения и прощания.",
    good: ["Завершение циклов", "Прощание со старым", "Подготовка к новому"],
    bad: ["Все новое", "Активные действия"],
    content: "Итоговый контент, завершение серий, прощание",
  },
};

export function calculateLunarDay(date: Date = new Date()): number {
  const phases = LUNAR_PHASES_2026.filter(p => p.type === "new");
  let lastNewMoon: Date | null = null;
  
  for (const phase of phases) {
    const phaseDate = new Date(phase.date + "T" + phase.time + ":00Z");
    if (phaseDate <= date) {
      lastNewMoon = phaseDate;
    } else {
      break;
    }
  }
  
  if (!lastNewMoon) {
    lastNewMoon = new Date("2025-12-20T01:43:00Z");
  }
  
  const diffMs = date.getTime() - lastNewMoon.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const lunarDay = Math.floor(diffDays) + 1;
  
  return Math.min(Math.max(lunarDay, 1), 30);
}

export function calculateMoonPhase(date: Date = new Date()): string {
  const lunarDay = calculateLunarDay(date);
  
  if (lunarDay === 1) return "Новолуние";
  if (lunarDay >= 2 && lunarDay <= 7) return "Растущий серп";
  if (lunarDay >= 8 && lunarDay <= 10) return "Первая четверть";
  if (lunarDay >= 11 && lunarDay <= 14) return "Растущая Луна";
  if (lunarDay === 15) return "Полнолуние";
  if (lunarDay >= 16 && lunarDay <= 18) return "Убывающая Луна";
  if (lunarDay >= 19 && lunarDay <= 22) return "Последняя четверть";
  if (lunarDay >= 23 && lunarDay <= 29) return "Убывающий серп";
  return "Темная Луна";
}

export function calculateMoonZodiac(date: Date = new Date()): { sign: string; element: string } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const lunarCyclePosition = (dayOfYear * 13.37) % 360;
  const adjustedPosition = (lunarCyclePosition + (date.getDate() * 12.2)) % 360;
  
  for (const sign of ZODIAC_SIGNS) {
    if (adjustedPosition >= sign.start && adjustedPosition < sign.end) {
      return { sign: sign.name, element: sign.element };
    }
  }
  
  return { sign: ZODIAC_SIGNS[0].name, element: ZODIAC_SIGNS[0].element };
}

export function getLunarDayData(date: Date = new Date()): MoonDayData {
  const lunarDay = calculateLunarDay(date);
  const phase = calculateMoonPhase(date);
  const zodiac = calculateMoonZodiac(date);
  const dayMeaning = LUNAR_DAY_MEANINGS[lunarDay] || LUNAR_DAY_MEANINGS[1];
  
  return {
    day: lunarDay,
    phase,
    zodiac: `Луна в ${zodiac.sign}е`,
    description: dayMeaning.description,
    good: dayMeaning.good,
    bad: dayMeaning.bad,
    contentRecommendation: dayMeaning.content,
  };
}

export function getUpcomingPhases(count: number = 4): Array<{ date: string; type: string; label: string }> {
  const today = new Date();
  const upcoming: Array<{ date: string; type: string; label: string }> = [];
  
  const typeLabels: Record<string, string> = {
    new: "Новолуние",
    first_quarter: "Первая четверть",
    full: "Полнолуние",
    last_quarter: "Последняя четверть",
  };
  
  for (const phase of LUNAR_PHASES_2026) {
    const phaseDate = new Date(phase.date);
    if (phaseDate >= today && upcoming.length < count) {
      upcoming.push({
        date: phase.date,
        type: phase.type,
        label: typeLabels[phase.type],
      });
    }
  }
  
  return upcoming;
}

export function getUpcomingEclipses(): typeof ECLIPSES_2026 {
  const today = new Date();
  return ECLIPSES_2026.filter(e => new Date(e.date) >= today);
}

import SunCalc from "suncalc";

export interface LunarData {
  lunarDay: number;
  phase: string;
  phasePercent: number;
  zodiacSign: string;
  isWaxing: boolean;
  illumination: number;
}

export interface MoonDayInfo {
  day: number;
  phase: string;
  zodiac: string;
  description: string;
  good: string[];
  bad: string[];
  contentRecommendation: string;
}

const ZODIAC_SIGNS = [
  { name: "Овен", start: 0 },
  { name: "Телец", start: 30 },
  { name: "Близнецы", start: 60 },
  { name: "Рак", start: 90 },
  { name: "Лев", start: 120 },
  { name: "Дева", start: 150 },
  { name: "Весы", start: 180 },
  { name: "Скорпион", start: 210 },
  { name: "Стрелец", start: 240 },
  { name: "Козерог", start: 270 },
  { name: "Водолей", start: 300 },
  { name: "Рыбы", start: 330 },
];

const ZODIAC_PREPOSITIONAL: Record<string, string> = {
  "Овен": "Овне",
  "Телец": "Тельце",
  "Близнецы": "Близнецах",
  "Рак": "Раке",
  "Лев": "Льве",
  "Дева": "Деве",
  "Весы": "Весах",
  "Скорпион": "Скорпионе",
  "Стрелец": "Стрельце",
  "Козерог": "Козероге",
  "Водолей": "Водолее",
  "Рыбы": "Рыбах",
};

function getZodiacPrepositional(sign: string): string {
  return ZODIAC_PREPOSITIONAL[sign] || sign;
}

function getMoonEclipticLongitude(date: Date): number {
  const JD = getJulianDate(date);
  const T = (JD - 2451545.0) / 36525;
  
  const L0 = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const M = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const Ms = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  
  const Mrad = M * Math.PI / 180;
  const Frad = F * Math.PI / 180;
  const Drad = D * Math.PI / 180;
  const Msrad = Ms * Math.PI / 180;
  
  let longitude = L0;
  longitude += 6.288774 * Math.sin(Mrad);
  longitude += 1.274027 * Math.sin(2 * Drad - Mrad);
  longitude += 0.658314 * Math.sin(2 * Drad);
  longitude += 0.213618 * Math.sin(2 * Mrad);
  longitude -= 0.185116 * Math.sin(Msrad);
  longitude -= 0.114332 * Math.sin(2 * Frad);
  
  longitude = longitude % 360;
  if (longitude < 0) longitude += 360;
  
  return longitude;
}

function getJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  let y = year;
  let m = month;
  
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + B - 1524.5;
}

function getZodiacSign(longitude: number): string {
  for (let i = ZODIAC_SIGNS.length - 1; i >= 0; i--) {
    if (longitude >= ZODIAC_SIGNS[i].start) {
      return ZODIAC_SIGNS[i].name;
    }
  }
  return ZODIAC_SIGNS[0].name;
}

function findNewMoon(date: Date): Date {
  const dayMs = 24 * 60 * 60 * 1000;
  const synodicMonth = 29.530588853;
  
  let searchDate = new Date(date.getTime() - synodicMonth * dayMs);
  let minPhase = 1;
  let newMoonDate = searchDate;
  
  for (let i = 0; i < Math.ceil(synodicMonth * 2); i++) {
    const checkDate = new Date(searchDate.getTime() + i * dayMs);
    if (checkDate > date) break;
    
    const moonIllum = SunCalc.getMoonIllumination(checkDate);
    if (moonIllum.fraction < minPhase) {
      minPhase = moonIllum.fraction;
      newMoonDate = checkDate;
    }
  }
  
  return newMoonDate;
}

export function calculateLunarDay(date: Date): number {
  const newMoon = findNewMoon(date);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysSinceNewMoon = Math.floor((date.getTime() - newMoon.getTime()) / dayMs);
  
  let lunarDay = daysSinceNewMoon + 1;
  if (lunarDay < 1) lunarDay = 1;
  if (lunarDay > 30) lunarDay = 30;
  
  return lunarDay;
}

export function getPhaseNameRu(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "Новолуние";
  if (phase < 0.22) return "Растущий серп";
  if (phase < 0.28) return "Первая четверть";
  if (phase < 0.47) return "Растущая луна";
  if (phase < 0.53) return "Полнолуние";
  if (phase < 0.72) return "Убывающая луна";
  if (phase < 0.78) return "Последняя четверть";
  return "Убывающий серп";
}

export function getLunarData(date: Date = new Date()): LunarData {
  const moonIllum = SunCalc.getMoonIllumination(date);
  const lunarDay = calculateLunarDay(date);
  const eclipticLong = getMoonEclipticLongitude(date);
  const zodiacSign = getZodiacSign(eclipticLong);
  
  return {
    lunarDay,
    phase: getPhaseNameRu(moonIllum.phase),
    phasePercent: Math.round(moonIllum.phase * 100),
    zodiacSign,
    isWaxing: moonIllum.phase < 0.5,
    illumination: Math.round(moonIllum.fraction * 100),
  };
}

const LUNAR_DAY_DESCRIPTIONS: Record<number, Omit<MoonDayInfo, "day" | "phase" | "zodiac">> = {
  1: {
    description: "День новых начинаний. Энергия обновления и чистого листа. Идеально для планирования и постановки целей.",
    good: ["Планирование", "Постановка целей", "Медитация", "Визуализация желаний"],
    bad: ["Активные действия", "Крупные сделки", "Операции"],
    contentRecommendation: "Посты о новых начинаниях, целях, планах. Анонсы новых проектов.",
  },
  2: {
    description: "День накопления энергии. Время для подготовки и сбора ресурсов. Хорошо для обучения.",
    good: ["Обучение", "Накопление знаний", "Финансовое планирование", "Покупки"],
    bad: ["Конфликты", "Споры", "Агрессивные переговоры"],
    contentRecommendation: "Образовательный контент, полезные советы, чек-листы.",
  },
  3: {
    description: "День активности и борьбы. Энергия для преодоления препятствий. Время действовать решительно.",
    good: ["Спорт", "Активные действия", "Конкуренция", "Защита интересов"],
    bad: ["Пассивность", "Уступки", "Начало спокойных дел"],
    contentRecommendation: "Мотивационный контент, истории преодоления, вызовы.",
  },
  4: {
    description: "День противоречий. Требует осторожности в словах и действиях. Хорошо для уединения.",
    good: ["Уединение", "Самоанализ", "Работа с тенью", "Прощение"],
    bad: ["Публичные выступления", "Важные решения", "Новые знакомства"],
    contentRecommendation: "Глубокий психологический контент, работа с блоками.",
  },
  5: {
    description: "День верности и питания. Благоприятен для всего связанного с едой и заботой о теле.",
    good: ["Питание", "Забота о теле", "Верность принципам", "Семейные дела"],
    bad: ["Голодание", "Жёсткие диеты", "Предательство"],
    contentRecommendation: "Контент о самозаботе, питании, ритуалах красоты.",
  },
  6: {
    description: "День интуиции и ясновидения. Усиливаются экстрасенсорные способности. Время для практик.",
    good: ["Гадания", "Медитация", "Развитие интуиции", "Сновидения"],
    bad: ["Ложь", "Манипуляции", "Игнорирование знаков"],
    contentRecommendation: "Эзотерический контент, расклады, предсказания.",
  },
  7: {
    description: "День силы слова. Всё сказанное имеет особую силу. Время для аффирмаций и намерений.",
    good: ["Аффирмации", "Заговоры", "Важные разговоры", "Переговоры"],
    bad: ["Пустословие", "Сплетни", "Негативные высказывания"],
    contentRecommendation: "Контент с аффирмациями, мантрами, силой намерения.",
  },
  8: {
    description: "День трансформации. Мощная энергия перемен. Хорошо для очищения и отпускания старого.",
    good: ["Очищение", "Трансформация", "Отпускание", "Голодание"],
    bad: ["Удержание старого", "Сопротивление переменам"],
    contentRecommendation: "Контент о трансформации, истории перемен, ритуалы очищения.",
  },
  9: {
    description: "День тёмных энергий. Требует защиты и осторожности. Не начинать важных дел.",
    good: ["Защитные ритуалы", "Очищение пространства", "Уединение"],
    bad: ["Новые начинания", "Важные решения", "Конфликты"],
    contentRecommendation: "Контент о защите, очищении, работе с негативом.",
  },
  10: {
    description: "День источника и рода. Связь с предками и корнями. Хорошо для семейных дел.",
    good: ["Работа с родом", "Семейные традиции", "Изучение родословной"],
    bad: ["Отречение от корней", "Конфликты с родственниками"],
    contentRecommendation: "Контент о роде, предках, семейных ценностях.",
  },
  11: {
    description: "День огненной силы. Мощная энергия для реализации. Один из самых сильных дней.",
    good: ["Важные дела", "Сложные задачи", "Проявление силы"],
    bad: ["Пассивность", "Страхи", "Упущенные возможности"],
    contentRecommendation: "Мощный продающий контент, призывы к действию.",
  },
  12: {
    description: "День сердца и любви. Благоприятен для отношений и творчества.",
    good: ["Любовь", "Творчество", "Благотворительность", "Молитвы"],
    bad: ["Злость", "Обиды", "Эгоизм"],
    contentRecommendation: "Контент о любви, отношениях, благодарности.",
  },
  13: {
    description: "День обновления и омоложения. Хорошо для процедур красоты и начала циклов.",
    good: ["Омоложение", "Красота", "Обучение", "Групповая работа"],
    bad: ["Одиночество", "Изоляция"],
    contentRecommendation: "Контент о красоте, молодости, групповых практиках.",
  },
  14: {
    description: "День призыва. Можно вызывать нужные энергии и события. Сильный день для практик.",
    good: ["Призывы", "Ритуалы привлечения", "Важная информация"],
    bad: ["Игнорирование знаков", "Закрытость"],
    contentRecommendation: "Контент о привлечении, манифестации, знаках вселенной.",
  },
  15: {
    description: "День искушений. Полнолуние близко. Требует контроля эмоций и желаний.",
    good: ["Самоконтроль", "Осознанность", "Защита от манипуляций"],
    bad: ["Поддаваться искушениям", "Важные решения под влиянием эмоций"],
    contentRecommendation: "Контент об осознанности, контроле эмоций, полнолунии.",
  },
  16: {
    description: "День гармонии. Стремление к балансу и справедливости. Хорош для творчества.",
    good: ["Творчество", "Гармонизация", "Справедливость", "Красота"],
    bad: ["Крайности", "Несправедливость", "Конфликты"],
    contentRecommendation: "Эстетический контент, гармония, баланс в жизни.",
  },
  17: {
    description: "День радости и свободы. Энергия праздника и освобождения. Хорош для женских практик.",
    good: ["Праздник", "Радость", "Женские практики", "Отношения"],
    bad: ["Уныние", "Ограничения", "Одиночество"],
    contentRecommendation: "Радостный контент, истории успеха, женские темы.",
  },
  18: {
    description: "День зеркала. Мир отражает внутреннее состояние. Время для самоанализа.",
    good: ["Самоанализ", "Работа с отражениями", "Осознание паттернов"],
    bad: ["Обвинение других", "Проекции", "Иллюзии"],
    contentRecommendation: "Психологический контент, самопознание, отражения.",
  },
  19: {
    description: "День паука - плетение судьбы. Осторожность с действиями, они имеют последствия.",
    good: ["Стратегическое планирование", "Терпение", "Кармическая работа"],
    bad: ["Интриги", "Обман", "Необдуманные действия"],
    contentRecommendation: "Контент о карме, последствиях, стратегии.",
  },
  20: {
    description: "День духовного подъёма. Высокие вибрации, подходит для духовных практик.",
    good: ["Духовные практики", "Пост", "Аскеза", "Просветление"],
    bad: ["Материализм", "Привязанности", "Чревоугодие"],
    contentRecommendation: "Духовный контент, медитации, практики осознанности.",
  },
  21: {
    description: "День воина и справедливости. Энергия для борьбы за правое дело.",
    good: ["Справедливость", "Защита", "Смелые решения", "Спорт"],
    bad: ["Трусость", "Несправедливость", "Бездействие"],
    contentRecommendation: "Мотивационный контент, истории победы, справедливость.",
  },
  22: {
    description: "День мудрости и знаний. Благоприятен для обучения и передачи опыта.",
    good: ["Обучение", "Преподавание", "Книги", "Мудрость"],
    bad: ["Невежество", "Упрямство", "Закрытость к новому"],
    contentRecommendation: "Образовательный контент, мудрость, глубокие инсайты.",
  },
  23: {
    description: "День хищника. Агрессивная энергия, требует направления в конструктивное русло.",
    good: ["Физическая активность", "Конкуренция", "Защита"],
    bad: ["Жертвенность", "Пассивность", "Агрессия без цели"],
    contentRecommendation: "Энергичный контент, соревнования, вызовы.",
  },
  24: {
    description: "День пробуждения сексуальной энергии. Творческая и жизненная сила.",
    good: ["Творчество", "Отношения", "Тантра", "Создание"],
    bad: ["Подавление энергии", "Аскеза", "Отказ от жизни"],
    contentRecommendation: "Контент о творческой энергии, отношениях, создании.",
  },
  25: {
    description: "День созерцания. Пассивная энергия, хорошо для отдыха и размышлений.",
    good: ["Отдых", "Медитация", "Созерцание", "Сны"],
    bad: ["Активные действия", "Важные решения", "Спешка"],
    contentRecommendation: "Спокойный контент, размышления, медитативные практики.",
  },
  26: {
    description: "День очищения и поста. Благоприятен для детокса и освобождения.",
    good: ["Пост", "Очищение", "Молчание", "Отпускание"],
    bad: ["Обжорство", "Накопление", "Привязанности"],
    contentRecommendation: "Контент о детоксе, очищении, минимализме.",
  },
  27: {
    description: "День тайных знаний. Открываются сокровенные истины. Хорош для оккультных практик.",
    good: ["Оккультизм", "Тайные практики", "Интуиция", "Символы"],
    bad: ["Поверхностность", "Материализм", "Скептицизм"],
    contentRecommendation: "Глубокий эзотерический контент, символизм, тайны.",
  },
  28: {
    description: "День гармонии с природой. Связь с землёй и естественными циклами.",
    good: ["Природа", "Садоводство", "Экология", "Заземление"],
    bad: ["Отрыв от природы", "Искусственность"],
    contentRecommendation: "Контент о природе, экологии, естественной жизни.",
  },
  29: {
    description: "Сатанинский день. Самый тяжёлый день лунного цикла. Максимальная осторожность.",
    good: ["Очищение", "Защита", "Завершение дел", "Отпускание"],
    bad: ["Новые начинания", "Важные решения", "Активность"],
    contentRecommendation: "Контент о завершении циклов, отпускании, подготовке к новому.",
  },
  30: {
    description: "День завершения цикла. Подведение итогов и прощание со старым.",
    good: ["Подведение итогов", "Благодарность", "Прощение", "Завершение"],
    bad: ["Начинания", "Планирование", "Накопление"],
    contentRecommendation: "Итоговый контент, благодарность, подготовка к новолунию.",
  },
};

export function getMoonDayInfo(date: Date = new Date()): MoonDayInfo {
  const lunarData = getLunarData(date);
  const dayData = LUNAR_DAY_DESCRIPTIONS[lunarData.lunarDay] || LUNAR_DAY_DESCRIPTIONS[1];
  
  return {
    day: lunarData.lunarDay,
    phase: lunarData.phase,
    zodiac: `Луна в ${getZodiacPrepositional(lunarData.zodiacSign)}`,
    ...dayData,
  };
}

export function getUpcomingPhasesCalculated(count: number = 4): Array<{ date: string; type: string; label: string }> {
  const phases: Array<{ date: string; type: string; label: string }> = [];
  const hourMs = 60 * 60 * 1000;
  const today = new Date();
  
  const phaseTargets = [
    { target: 0.00, type: "new", label: "Новолуние" },
    { target: 0.25, type: "first_quarter", label: "Первая четверть" },
    { target: 0.50, type: "full", label: "Полнолуние" },
    { target: 0.75, type: "last_quarter", label: "Последняя четверть" },
  ];
  
  const startPhase = SunCalc.getMoonIllumination(today).phase;
  
  const pendingTargets = phaseTargets.map(pt => {
    const baseCycle = pt.target <= startPhase ? 1 : 0;
    return {
      ...pt,
      nextUnwrapped: pt.target + baseCycle,
      found: false,
    };
  });
  
  let cycleOffset = 0;
  let prevRawPhase = startPhase;
  
  for (let h = 1; h <= 90 * 24 && phases.length < count; h++) {
    const checkDate = new Date(today.getTime() + h * hourMs);
    const rawPhase = SunCalc.getMoonIllumination(checkDate).phase;
    
    if (rawPhase < prevRawPhase - 0.5) {
      cycleOffset += 1;
    }
    
    const unwrappedPhase = rawPhase + cycleOffset;
    const prevUnwrapped = prevRawPhase + (rawPhase < prevRawPhase - 0.5 ? cycleOffset - 1 : cycleOffset);
    
    for (const pt of pendingTargets) {
      if (pt.found) continue;
      
      if (prevUnwrapped < pt.nextUnwrapped && unwrappedPhase >= pt.nextUnwrapped) {
        pt.found = true;
        phases.push({
          date: checkDate.toISOString().split("T")[0],
          type: pt.type,
          label: pt.label,
        });
      }
    }
    
    prevRawPhase = rawPhase;
  }
  
  phases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return phases.slice(0, count);
}

export const ECLIPSES_2026 = [
  {
    date: "2026-02-17",
    type: "solar_annular",
    description: "Кольцеобразное солнечное затмение",
  },
  {
    date: "2026-03-03",
    type: "lunar_total",
    description: "Полное лунное затмение",
  },
  {
    date: "2026-08-12",
    type: "solar_total",
    description: "Полное солнечное затмение",
  },
  {
    date: "2026-08-28",
    type: "lunar_partial",
    description: "Частное лунное затмение",
  },
];

export const SEASONS_2026 = {
  spring: { date: "2026-03-20", description: "Весеннее равноденствие" },
  summer: { date: "2026-06-21", description: "Летнее солнцестояние" },
  autumn: { date: "2026-09-23", description: "Осеннее равноденствие" },
  winter: { date: "2026-12-21", description: "Зимнее солнцестояние" },
};

export function getUpcomingEclipses(): Array<{ date: string; type: string; description: string }> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  return ECLIPSES_2026.filter(e => e.date >= todayStr);
}

# ТЗ: Лунный Календарь — Техническое Задание

## Общее описание

Модуль «Лунный Календарь» — виджет на клиентской стороне без запросов к серверу. Показывает пользователю текущее состояние луны, рекомендации по активности и контенту, ближайшие лунные события.

Всё вычисляется прямо в браузере на основе текущей даты.

---

## Стек

- **Язык**: TypeScript (или JS)
- **Библиотека для луны**: [`suncalc`](https://github.com/mourner/suncalc) — лёгкая, без зависимостей
- **Фреймворк**: любой (React, Vue, Svelte — не принципиально)
- **Серверные запросы**: не нужны

Установка:
```bash
npm install suncalc
npm install --save-dev @types/suncalc
```

---

## Архитектура модуля

```
lunarCalendar/
  lunarCalculator.ts   — вся математика и данные
  lunarData2026.ts     — хардкод точных дат фаз на год
  LunarCalendar.tsx    — UI-компонент
```

---

## Модуль вычислений (`lunarCalculator.ts`)

### Типы данных

```typescript
interface LunarData {
  lunarDay: number;       // лунный день 1–30
  phase: string;          // название фазы на русском
  phasePercent: number;   // 0–100, где 50 = полнолуние
  zodiacSign: string;     // знак зодиака
  isWaxing: boolean;      // растущая (true) или убывающая (false)
  illumination: number;   // освещённость 0–100%
}

interface MoonDayInfo {
  day: number;
  phase: string;
  zodiac: string;                // «Луна в Тельце»
  description: string;           // описание дня
  good: string[];                // что хорошо делать
  bad: string[];                 // что не рекомендуется
  contentRecommendation: string; // совет по контенту для соцсетей
}
```

### Функции

#### `getLunarData(date: Date): LunarData`
Основная функция. Возвращает все данные о луне на указанную дату.

Использует:
- `SunCalc.getMoonIllumination(date)` → `.phase` (0–1), `.fraction` (освещённость 0–1)
- `calculateLunarDay(date)` → лунный день
- `getMoonEclipticLongitude(date)` → знак зодиака

#### `calculateLunarDay(date: Date): number`
Находит ближайшее предыдущее новолуние перебором дней (ищет минимум `fraction` за последние ~30 дней).
Лунный день = количество дней от новолуния + 1. Диапазон: 1–30.

```typescript
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

function calculateLunarDay(date: Date): number {
  const newMoon = findNewMoon(date);
  const dayMs = 24 * 60 * 60 * 1000;
  let lunarDay = Math.floor((date.getTime() - newMoon.getTime()) / dayMs) + 1;
  if (lunarDay < 1) lunarDay = 1;
  if (lunarDay > 30) lunarDay = 30;
  return lunarDay;
}
```

#### `getMoonEclipticLongitude(date: Date): number`
Считает эклиптическую долготу луны через юлианские даты (упрощённая формула, 6 основных членов):

```typescript
function getJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + B - 1524.5;
}

function getMoonEclipticLongitude(date: Date): number {
  const JD = getJulianDate(date);
  const T = (JD - 2451545.0) / 36525;
  const toRad = Math.PI / 180;

  const L0 = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const M  = 134.9633964 + 477198.8675055  * T + 0.0087414 * T * T;
  const F  = 93.2720950  + 483202.0175233  * T - 0.0036539 * T * T;
  const D  = 297.8501921 + 445267.1114034  * T - 0.0018819 * T * T;
  const Ms = 357.5291092 + 35999.0502909   * T - 0.0001536 * T * T;

  let longitude = L0
    + 6.288774 * Math.sin(M  * toRad)
    + 1.274027 * Math.sin((2 * D - M) * toRad)
    + 0.658314 * Math.sin(2 * D * toRad)
    + 0.213618 * Math.sin(2 * M * toRad)
    - 0.185116 * Math.sin(Ms * toRad)
    - 0.114332 * Math.sin(2 * F * toRad);

  return ((longitude % 360) + 360) % 360;
}
```

#### `getPhaseNameRu(phase: number): string`
Переводит числовое значение фазы (0–1) в название:

| phase | Название |
|-------|----------|
| < 0.03 или > 0.97 | Новолуние |
| 0.03 – 0.22 | Растущий серп |
| 0.22 – 0.28 | Первая четверть |
| 0.28 – 0.47 | Растущая луна |
| 0.47 – 0.53 | Полнолуние |
| 0.53 – 0.72 | Убывающая луна |
| 0.72 – 0.78 | Последняя четверть |
| 0.78 – 0.97 | Убывающий серп |

#### `getUpcomingPhasesCalculated(count: number): Array<{date, type, label}>`
Ищет ближайшие N фаз луны. Алгоритм:
- Перебирает каждый час вперёд до 90 дней
- Отслеживает момент пересечения порогов 0.00 / 0.25 / 0.50 / 0.75 с учётом сброса цикла (1.0 → 0.0)
- Возвращает дату первого пересечения каждого порога, сортирует по дате

```typescript
function getUpcomingPhasesCalculated(count = 4) {
  const phases = [];
  const hourMs = 60 * 60 * 1000;
  const today = new Date();

  const phaseTargets = [
    { target: 0.00, type: "new",           label: "Новолуние" },
    { target: 0.25, type: "first_quarter", label: "Первая четверть" },
    { target: 0.50, type: "full",          label: "Полнолуние" },
    { target: 0.75, type: "last_quarter",  label: "Последняя четверть" },
  ];

  const startPhase = SunCalc.getMoonIllumination(today).phase;
  const pendingTargets = phaseTargets.map(pt => ({
    ...pt,
    nextUnwrapped: pt.target + (pt.target <= startPhase ? 1 : 0),
    found: false,
  }));

  let cycleOffset = 0;
  let prevRawPhase = startPhase;

  for (let h = 1; h <= 90 * 24 && phases.length < count; h++) {
    const checkDate = new Date(today.getTime() + h * hourMs);
    const rawPhase = SunCalc.getMoonIllumination(checkDate).phase;
    if (rawPhase < prevRawPhase - 0.5) cycleOffset += 1;

    const unwrappedPhase = rawPhase + cycleOffset;
    const prevUnwrapped = prevRawPhase + (rawPhase < prevRawPhase - 0.5 ? cycleOffset - 1 : cycleOffset);

    for (const pt of pendingTargets) {
      if (pt.found) continue;
      if (prevUnwrapped < pt.nextUnwrapped && unwrappedPhase >= pt.nextUnwrapped) {
        pt.found = true;
        phases.push({ date: checkDate.toISOString().split("T")[0], type: pt.type, label: pt.label });
      }
    }
    prevRawPhase = rawPhase;
  }

  return phases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, count);
}
```

---

## Знаки зодиака

Каждые 30° эклиптической долготы — один знак:

| Долгота | Знак | Предложный падеж |
|---------|------|-----------------|
| 0° | Овен | Овне |
| 30° | Телец | Тельце |
| 60° | Близнецы | Близнецах |
| 90° | Рак | Раке |
| 120° | Лев | Льве |
| 150° | Дева | Деве |
| 180° | Весы | Весах |
| 210° | Скорпион | Скорпионе |
| 240° | Стрелец | Стрельце |
| 270° | Козерог | Козероге |
| 300° | Водолей | Водолее |
| 330° | Рыбы | Рыбах |

В тексте используется: «Луна в Тельце», «Луна в Скорпионе» и т.д.

---

## Описания лунных дней (хардкод, все 30)

```typescript
const LUNAR_DAY_DESCRIPTIONS = {
  1:  { description: "День новых начинаний. Энергия обновления и чистого листа. Идеально для планирования.",
        good: ["Планирование", "Постановка целей", "Медитация", "Визуализация желаний"],
        bad: ["Активные действия", "Крупные сделки", "Операции"],
        contentRecommendation: "Посты о новых начинаниях, целях, планах. Анонсы новых проектов." },

  2:  { description: "День накопления энергии. Время для подготовки и сбора ресурсов. Хорошо для обучения.",
        good: ["Обучение", "Накопление знаний", "Финансовое планирование", "Покупки"],
        bad: ["Конфликты", "Споры", "Агрессивные переговоры"],
        contentRecommendation: "Образовательный контент, полезные советы, чек-листы." },

  3:  { description: "День активности и борьбы. Энергия для преодоления препятствий. Время действовать решительно.",
        good: ["Спорт", "Активные действия", "Конкуренция", "Защита интересов"],
        bad: ["Пассивность", "Уступки", "Начало спокойных дел"],
        contentRecommendation: "Мотивационный контент, истории преодоления, вызовы." },

  4:  { description: "День противоречий. Требует осторожности в словах и действиях. Хорошо для уединения.",
        good: ["Уединение", "Самоанализ", "Работа с тенью", "Прощение"],
        bad: ["Публичные выступления", "Важные решения", "Новые знакомства"],
        contentRecommendation: "Глубокий психологический контент, работа с блоками." },

  5:  { description: "День верности и питания. Благоприятен для всего связанного с едой и заботой о теле.",
        good: ["Питание", "Забота о теле", "Верность принципам", "Семейные дела"],
        bad: ["Голодание", "Жёсткие диеты", "Предательство"],
        contentRecommendation: "Контент о самозаботе, питании, ритуалах красоты." },

  6:  { description: "День интуиции и ясновидения. Усиливаются экстрасенсорные способности.",
        good: ["Гадания", "Медитация", "Развитие интуиции", "Сновидения"],
        bad: ["Ложь", "Манипуляции", "Игнорирование знаков"],
        contentRecommendation: "Эзотерический контент, расклады, предсказания." },

  7:  { description: "День силы слова. Всё сказанное имеет особую силу. Время для аффирмаций.",
        good: ["Аффирмации", "Заговоры", "Важные разговоры", "Переговоры"],
        bad: ["Пустословие", "Сплетни", "Негативные высказывания"],
        contentRecommendation: "Контент с аффирмациями, мантрами, силой намерения." },

  8:  { description: "День трансформации. Мощная энергия перемен. Хорошо для очищения.",
        good: ["Очищение", "Трансформация", "Отпускание", "Голодание"],
        bad: ["Удержание старого", "Сопротивление переменам"],
        contentRecommendation: "Контент о трансформации, истории перемен, ритуалы очищения." },

  9:  { description: "День тёмных энергий. Требует защиты и осторожности. Не начинать важных дел.",
        good: ["Защитные ритуалы", "Очищение пространства", "Уединение"],
        bad: ["Новые начинания", "Важные решения", "Конфликты"],
        contentRecommendation: "Контент о защите, очищении, работе с негативом." },

  10: { description: "День источника и рода. Связь с предками и корнями.",
        good: ["Работа с родом", "Семейные традиции", "Изучение родословной"],
        bad: ["Отречение от корней", "Конфликты с родственниками"],
        contentRecommendation: "Контент о роде, предках, семейных ценностях." },

  11: { description: "День огненной силы. Мощная энергия для реализации. Один из самых сильных дней.",
        good: ["Важные дела", "Сложные задачи", "Проявление силы"],
        bad: ["Пассивность", "Страхи", "Упущенные возможности"],
        contentRecommendation: "Мощный продающий контент, призывы к действию." },

  12: { description: "День сердца и любви. Благоприятен для отношений и творчества.",
        good: ["Любовь", "Творчество", "Благотворительность", "Молитвы"],
        bad: ["Злость", "Обиды", "Эгоизм"],
        contentRecommendation: "Контент о любви, отношениях, благодарности." },

  13: { description: "День обновления и омоложения. Хорошо для процедур красоты.",
        good: ["Омоложение", "Красота", "Обучение", "Групповая работа"],
        bad: ["Одиночество", "Изоляция"],
        contentRecommendation: "Контент о красоте, молодости, групповых практиках." },

  14: { description: "День призыва. Можно вызывать нужные энергии и события. Сильный день для практик.",
        good: ["Призывы", "Ритуалы привлечения", "Важная информация"],
        bad: ["Игнорирование знаков", "Закрытость"],
        contentRecommendation: "Контент о привлечении, манифестации, знаках вселенной." },

  15: { description: "День искушений. Полнолуние близко. Требует контроля эмоций и желаний.",
        good: ["Самоконтроль", "Осознанность", "Защита от манипуляций"],
        bad: ["Поддаваться искушениям", "Важные решения под влиянием эмоций"],
        contentRecommendation: "Контент об осознанности, контроле эмоций, полнолунии." },

  16: { description: "День гармонии. Стремление к балансу и справедливости.",
        good: ["Творчество", "Гармонизация", "Справедливость", "Красота"],
        bad: ["Крайности", "Несправедливость", "Конфликты"],
        contentRecommendation: "Эстетический контент, гармония, баланс в жизни." },

  17: { description: "День радости и свободы. Энергия праздника и освобождения.",
        good: ["Праздник", "Радость", "Женские практики", "Отношения"],
        bad: ["Уныние", "Ограничения", "Одиночество"],
        contentRecommendation: "Радостный контент, истории успеха, женские темы." },

  18: { description: "День зеркала. Мир отражает внутреннее состояние. Время для самоанализа.",
        good: ["Самоанализ", "Работа с отражениями", "Осознание паттернов"],
        bad: ["Обвинение других", "Проекции", "Иллюзии"],
        contentRecommendation: "Психологический контент, самопознание, отражения." },

  19: { description: "День паука — плетение судьбы. Осторожность с действиями, они имеют последствия.",
        good: ["Стратегическое планирование", "Терпение", "Кармическая работа"],
        bad: ["Интриги", "Обман", "Необдуманные действия"],
        contentRecommendation: "Контент о карме, последствиях, стратегии." },

  20: { description: "День духовного подъёма. Высокие вибрации, подходит для духовных практик.",
        good: ["Духовные практики", "Пост", "Аскеза", "Просветление"],
        bad: ["Материализм", "Привязанности", "Чревоугодие"],
        contentRecommendation: "Духовный контент, медитации, практики осознанности." },

  21: { description: "День воина и справедливости. Энергия для борьбы за правое дело.",
        good: ["Справедливость", "Защита", "Смелые решения", "Спорт"],
        bad: ["Трусость", "Несправедливость", "Бездействие"],
        contentRecommendation: "Мотивационный контент, истории победы, справедливость." },

  22: { description: "День мудрости и знаний. Благоприятен для обучения и передачи опыта.",
        good: ["Обучение", "Преподавание", "Книги", "Мудрость"],
        bad: ["Невежество", "Упрямство", "Закрытость к новому"],
        contentRecommendation: "Образовательный контент, мудрость, глубокие инсайты." },

  23: { description: "День хищника. Агрессивная энергия, требует направления в конструктивное русло.",
        good: ["Физическая активность", "Конкуренция", "Защита"],
        bad: ["Жертвенность", "Пассивность", "Агрессия без цели"],
        contentRecommendation: "Энергичный контент, соревнования, вызовы." },

  24: { description: "День пробуждения творческой и жизненной энергии.",
        good: ["Творчество", "Отношения", "Создание"],
        bad: ["Подавление энергии", "Аскеза", "Отказ от жизни"],
        contentRecommendation: "Контент о творческой энергии, отношениях, создании." },

  25: { description: "День созерцания. Пассивная энергия, хорошо для отдыха и размышлений.",
        good: ["Отдых", "Медитация", "Созерцание", "Сны"],
        bad: ["Активные действия", "Важные решения", "Спешка"],
        contentRecommendation: "Спокойный контент, размышления, медитативные практики." },

  26: { description: "День очищения и поста. Благоприятен для детокса и освобождения.",
        good: ["Пост", "Очищение", "Молчание", "Отпускание"],
        bad: ["Обжорство", "Накопление", "Привязанности"],
        contentRecommendation: "Контент о детоксе, очищении, минимализме." },

  27: { description: "День тайных знаний. Открываются сокровенные истины.",
        good: ["Оккультизм", "Тайные практики", "Интуиция", "Символы"],
        bad: ["Поверхностность", "Материализм", "Скептицизм"],
        contentRecommendation: "Глубокий эзотерический контент, символизм, тайны." },

  28: { description: "День гармонии с природой. Связь с землёй и естественными циклами.",
        good: ["Природа", "Садоводство", "Экология", "Заземление"],
        bad: ["Отрыв от природы", "Искусственность"],
        contentRecommendation: "Контент о природе, экологии, естественной жизни." },

  29: { description: "Самый тяжёлый день лунного цикла. Максимальная осторожность.",
        good: ["Очищение", "Защита", "Завершение дел", "Отпускание"],
        bad: ["Новые начинания", "Важные решения", "Активность"],
        contentRecommendation: "Контент о завершении циклов, отпускании, подготовке к новому." },

  30: { description: "День завершения цикла. Подведение итогов и прощание со старым.",
        good: ["Подведение итогов", "Благодарность", "Прощение", "Завершение"],
        bad: ["Начинания", "Планирование", "Накопление"],
        contentRecommendation: "Итоговый контент, благодарность, подготовка к новолунию." },
};
```

---

## Хардкод событий 2026 года

### Затмения

```typescript
const ECLIPSES_2026 = [
  { date: "2026-02-17", type: "solar_annular", description: "Кольцеобразное солнечное затмение" },
  { date: "2026-03-03", type: "lunar_total",   description: "Полное лунное затмение" },
  { date: "2026-08-12", type: "solar_total",   description: "Полное солнечное затмение" },
  { date: "2026-08-28", type: "lunar_partial", description: "Частное лунное затмение" },
];

// Фильтровать: показывать только будущие
function getUpcomingEclipses() {
  const todayStr = new Date().toISOString().split("T")[0];
  return ECLIPSES_2026.filter(e => e.date >= todayStr);
}
```

### Сезоны

```typescript
const SEASONS_2026 = {
  spring: { date: "2026-03-20", description: "Весеннее равноденствие" },
  summer: { date: "2026-06-21", description: "Летнее солнцестояние" },
  autumn: { date: "2026-09-23", description: "Осеннее равноденствие" },
  winter: { date: "2026-12-21", description: "Зимнее солнцестояние" },
};
```

### Точные фазы 2026 (для блока «Следующее полнолуние в ЧЧ:ММ»)

```typescript
// Формат: { date: "YYYY-MM-DD", type: "new"|"first_quarter"|"full"|"last_quarter", time: "ЧЧ:ММ" UTC }
const LUNAR_PHASES_2026 = [
  { date: "2026-01-03", type: "full",          time: "00:02" },
  { date: "2026-01-10", type: "last_quarter",  time: "15:48" },
  { date: "2026-01-18", type: "new",           time: "19:51" },
  { date: "2026-01-25", type: "first_quarter", time: "21:48" },
  { date: "2026-02-01", type: "full",          time: "21:09" },
  { date: "2026-02-09", type: "last_quarter",  time: "12:43" },
  { date: "2026-02-17", type: "new",           time: "12:01" },
  { date: "2026-02-24", type: "first_quarter", time: "09:28" },
  { date: "2026-03-03", type: "full",          time: "11:37" },
  { date: "2026-03-11", type: "last_quarter",  time: "06:38" },
  { date: "2026-03-19", type: "new",           time: "01:23" },
  { date: "2026-03-25", type: "first_quarter", time: "19:17" },
  { date: "2026-04-02", type: "full",          time: "00:12" },
  { date: "2026-04-09", type: "last_quarter",  time: "21:51" },
  { date: "2026-04-17", type: "new",           time: "11:52" },
  { date: "2026-04-24", type: "first_quarter", time: "03:32" },
  { date: "2026-05-01", type: "full",          time: "10:23" },
  { date: "2026-05-09", type: "last_quarter",  time: "10:10" },
  { date: "2026-05-16", type: "new",           time: "20:01" },
  { date: "2026-05-23", type: "first_quarter", time: "11:11" },
  { date: "2026-05-31", type: "full",          time: "08:45" },
  { date: "2026-06-07", type: "last_quarter",  time: "20:00" },
  { date: "2026-06-15", type: "new",           time: "02:54" },
  { date: "2026-06-22", type: "first_quarter", time: "03:57" },
  { date: "2026-06-29", type: "full",          time: "10:57" },
  { date: "2026-07-07", type: "last_quarter",  time: "02:29" },
  { date: "2026-07-14", type: "new",           time: "07:43" },
  { date: "2026-07-21", type: "first_quarter", time: "21:38" },
  { date: "2026-07-28", type: "full",          time: "18:36" },
  { date: "2026-08-05", type: "last_quarter",  time: "07:23" },
  { date: "2026-08-12", type: "new",           time: "13:37" },
  { date: "2026-08-20", type: "first_quarter", time: "17:47" },
  { date: "2026-08-27", type: "full",          time: "07:07" },  // +затмение 28.08
  { date: "2026-09-03", type: "last_quarter",  time: "12:51" },
  { date: "2026-09-10", type: "new",           time: "22:27" },
  { date: "2026-09-19", type: "first_quarter", time: "14:44" },
  { date: "2026-09-26", type: "full",          time: "01:49" },
  { date: "2026-10-03", type: "last_quarter",  time: "20:25" },
  { date: "2026-10-10", type: "new",           time: "10:50" },
  { date: "2026-10-19", type: "first_quarter", time: "11:13" },
  { date: "2026-10-25", type: "full",          time: "23:12" },
  { date: "2026-11-02", type: "last_quarter",  time: "07:30" },
  { date: "2026-11-09", type: "new",           time: "03:02" },
  { date: "2026-11-18", type: "first_quarter", time: "05:47" },
  { date: "2026-11-24", type: "full",          time: "22:53" },
  { date: "2026-12-01", type: "last_quarter",  time: "22:00" },
  { date: "2026-12-08", type: "new",           time: "22:52" },
  { date: "2026-12-17", type: "first_quarter", time: "21:43" },
  { date: "2026-12-24", type: "full",          time: "18:28" },
];
```

---

## UI-компонент — блоки интерфейса

**1. Заголовок** — текущая дата полностью: «пятница, 1 мая 2026 г.»

**2. Визуальный круг луны** — меняет CSS-градиент по лунному дню:

| Дни | Стиль |
|-----|-------|
| 1–3 | Тёмно-серый (новолуние) |
| 4–7 | Градиент серый → светло-фиолетовый |
| 8–11 | Градиент фиолетовый → светлый |
| 12–15 | Светло-фиолетовый → розовый (полнолуние) |
| 16–19 | Обратный: розовый → фиолетовый |
| 20–23 | Фиолетовый → серый |
| 24–30 | Тёмно-серый |

**3. Основные данные:**
- Лунный день: «🌕 15-й лунный день»
- Фаза: «Полнолуние»
- Знак зодиака: «Луна в Скорпионе»
- Освещённость: «98%»
- Растущая / убывающая (бейдж)

**4. Описание дня** — текстовый абзац

**5. Блок «Хорошо сегодня»** — зелёные чипы/бейджи из массива `good[]`

**6. Блок «Не рекомендуется»** — красные чипы/бейджи из массива `bad[]`

**7. Совет по контенту** — выделенная карточка с `contentRecommendation`

**8. Ближайшие 4 фазы** (вычислять динамически):
```
🌑 Новолуние — 16 мая
🌓 Первая четверть — 23 мая
🌕 Полнолуние — 31 мая
🌗 Последняя четверть — 7 июня
```

**9. Ближайшие затмения** — из хардкода, только будущие (не более 2)

### Инициализация компонента

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    const today = new Date();
    const moonInfo = getMoonDayInfo(today);
    const lunarData = getLunarData(today);
    const phases = getUpcomingPhasesCalculated(4);
    const eclipses = getUpcomingEclipses().slice(0, 2);
    // сохранить в state и убрать лоадер
  }, 500); // небольшая задержка для плавности
  return () => clearTimeout(timer);
}, []);
```

---

## Известные ограничения

| Ограничение | Описание |
|-------------|----------|
| Затмения и сезоны | Хардкод только на 2026. В 2027 нужно обновить |
| Точность лунного дня | ±1 день (алгоритм ищет минимум освещённости с точностью до суток) |
| Знак зодиака | Упрощённая формула, погрешность ±1–2° на границах знаков |
| Часовой пояс | Все расчёты в UTC. Для точности — передавать локальную дату с поправкой |

---

## Минимальный рабочий пример (MVP за 5 минут)

```typescript
import SunCalc from 'suncalc';

const today = new Date();
const moonIllum = SunCalc.getMoonIllumination(today);

console.log('Фаза (0–1):', moonIllum.phase);
// 0 = новолуние, 0.5 = полнолуние

console.log('Освещённость:', Math.round(moonIllum.fraction * 100) + '%');

// Название фазы
function getPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "Новолуние";
  if (phase < 0.47) return "Растущая луна";
  if (phase < 0.53) return "Полнолуние";
  return "Убывающая луна";
}

console.log('Фаза:', getPhaseName(moonIllum.phase));
```

Это даёт рабочий базовый виджет. Всё остальное — расширение этой основы.

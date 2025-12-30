import { ArchetypeId } from './archetypes';

export interface ArchetypeFontConfig {
  id: ArchetypeId;
  name: string;
  headerFont: string;
  bodyFont: string;
  colors: string[];
  vibes: string;
}

export const archetypeFontConfigs: Record<ArchetypeId, ArchetypeFontConfig> = {
  mag: {
    id: "mag",
    name: "Маг",
    headerFont: "Cormorant Garamond",
    bodyFont: "Inter",
    colors: ["#7c3aed", "#1e1b4b", "#fbbf24"],
    vibes: "Мистический минимализм с золотыми акцентами"
  },
  prostodushny: {
    id: "prostodushny",
    name: "Простодушный",
    headerFont: "Nunito",
    bodyFont: "Open Sans",
    colors: ["#fef3c7", "#fde68a", "#93c5fd"],
    vibes: "Светлый, воздушный, пастельные тона"
  },
  mudrets: {
    id: "mudrets",
    name: "Мудрец",
    headerFont: "Merriweather",
    bodyFont: "Roboto",
    colors: ["#1e3a5f", "#94a3b8", "#f8fafc"],
    vibes: "Классический, академичный, структурированный"
  },
  iskatel: {
    id: "iskatel",
    name: "Искатель",
    headerFont: "Montserrat",
    bodyFont: "Lato",
    colors: ["#059669", "#34d399", "#fcd34d"],
    vibes: "Природный, динамичный, с элементами путешествий"
  },
  slavny_maly: {
    id: "slavny_maly",
    name: "Славный малый",
    headerFont: "Rubik",
    bodyFont: "Inter",
    colors: ["#f97316", "#fed7aa", "#fef3c7"],
    vibes: "Тёплый, уютный, дружеский"
  },
  geroy: {
    id: "geroy",
    name: "Герой",
    headerFont: "Oswald",
    bodyFont: "Source Sans 3",
    colors: ["#dc2626", "#1e293b", "#fbbf24"],
    vibes: "Энергичный, мощный, с яркими акцентами"
  },
  buntar: {
    id: "buntar",
    name: "Бунтарь",
    headerFont: "Impact",
    bodyFont: "Roboto Condensed",
    colors: ["#18181b", "#ef4444", "#f5f5f5"],
    vibes: "Контрастный, дерзкий, с красными акцентами"
  },
  vlyublyonny: {
    id: "vlyublyonny",
    name: "Влюблённый",
    headerFont: "Playfair Display",
    bodyFont: "Lora",
    colors: ["#be185d", "#fda4af", "#ffe4e6"],
    vibes: "Романтичный, элегантный, с розовыми оттенками"
  },
  shut: {
    id: "shut",
    name: "Шут",
    headerFont: "Fredoka",
    bodyFont: "Quicksand",
    colors: ["#f59e0b", "#8b5cf6", "#06b6d4"],
    vibes: "Яркий, игривый, разноцветный"
  },
  zabotlivy: {
    id: "zabotlivy",
    name: "Заботливый",
    headerFont: "Georgia",
    bodyFont: "Nunito",
    colors: ["#ec4899", "#f9a8d4", "#fdf2f8"],
    vibes: "Мягкий, заботливый, с розовыми тонами"
  },
  tvorets: {
    id: "tvorets",
    name: "Творец",
    headerFont: "Bebas Neue",
    bodyFont: "Poppins",
    colors: ["#6366f1", "#a78bfa", "#e0e7ff"],
    vibes: "Креативный, вдохновляющий, фиолетовые тона"
  },
  pravitel: {
    id: "pravitel",
    name: "Правитель",
    headerFont: "Cinzel",
    bodyFont: "Raleway",
    colors: ["#78350f", "#d97706", "#fef3c7"],
    vibes: "Роскошный, властный, золотисто-коричневый"
  }
};

export const allFonts = [
  { name: "Cormorant Garamond", type: "header" as const },
  { name: "Inter", type: "body" as const },
  { name: "Nunito", type: "both" as const },
  { name: "Open Sans", type: "body" as const },
  { name: "Merriweather", type: "header" as const },
  { name: "Roboto", type: "body" as const },
  { name: "Montserrat", type: "header" as const },
  { name: "Lato", type: "body" as const },
  { name: "Rubik", type: "header" as const },
  { name: "Oswald", type: "header" as const },
  { name: "Source Sans 3", type: "body" as const },
  { name: "Roboto Condensed", type: "body" as const },
  { name: "Playfair Display", type: "header" as const },
  { name: "Lora", type: "body" as const },
  { name: "Fredoka", type: "header" as const },
  { name: "Quicksand", type: "body" as const },
  { name: "Georgia", type: "header" as const },
  { name: "Poppins", type: "body" as const },
  { name: "Bebas Neue", type: "header" as const },
  { name: "Cinzel", type: "header" as const },
  { name: "Raleway", type: "body" as const },
];

export const backgroundPresets = [
  // Gradients
  { id: "gradient-purple", name: "Мистический", type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "gradient-dark", name: "Тёмная ночь", type: "gradient", value: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { id: "gradient-rose", name: "Розовый рассвет", type: "gradient", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "gradient-ocean", name: "Океан", type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" },
  { id: "gradient-gold", name: "Золотой", type: "gradient", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { id: "gradient-emerald", name: "Изумрудный", type: "gradient", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { id: "gradient-sunset", name: "Закат", type: "gradient", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { id: "gradient-cosmic", name: "Космос", type: "gradient", value: "linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 30%, #2d1b4e 60%, #1a1a2e 100%)" },
  { id: "gradient-forest", name: "Лесной", type: "gradient", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { id: "gradient-warm", name: "Тёплый", type: "gradient", value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)" },
  { id: "gradient-lavender", name: "Лавандовый", type: "gradient", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)" },
  { id: "gradient-peach", name: "Персиковый", type: "gradient", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { id: "gradient-mint", name: "Мятный", type: "gradient", value: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)" },
  { id: "gradient-berry", name: "Ягодный", type: "gradient", value: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)" },
  { id: "gradient-night-sky", name: "Ночное небо", type: "gradient", value: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)" },
  { id: "gradient-fire", name: "Огненный", type: "gradient", value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { id: "gradient-royal", name: "Королевский", type: "gradient", value: "linear-gradient(135deg, #141e30 0%, #243b55 100%)" },
  { id: "gradient-cherry", name: "Вишнёвый", type: "gradient", value: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)" },
  // Solids
  { id: "solid-white", name: "Белый", type: "solid", value: "#ffffff" },
  { id: "solid-cream", name: "Кремовый", type: "solid", value: "#fef3c7" },
  { id: "solid-dark", name: "Тёмный", type: "solid", value: "#1a1a2e" },
  { id: "solid-purple", name: "Фиолетовый", type: "solid", value: "#7c3aed" },
  { id: "solid-pink", name: "Розовый", type: "solid", value: "#ec4899" },
  { id: "solid-blue", name: "Синий", type: "solid", value: "#3b82f6" },
  { id: "solid-green", name: "Зелёный", type: "solid", value: "#10b981" },
  { id: "solid-orange", name: "Оранжевый", type: "solid", value: "#f97316" },
  { id: "solid-red", name: "Красный", type: "solid", value: "#ef4444" },
  { id: "solid-teal", name: "Бирюзовый", type: "solid", value: "#14b8a6" },
  // Pastels
  { id: "pastel-beige", name: "Бежевый", type: "solid", value: "#f5f0e6" },
  { id: "pastel-sand", name: "Песочный", type: "solid", value: "#e8dcc8" },
  { id: "pastel-gray", name: "Светло-серый", type: "solid", value: "#e5e7eb" },
  { id: "pastel-smoke", name: "Дымчатый", type: "solid", value: "#d1d5db" },
  { id: "pastel-dusty-rose", name: "Пыльная роза", type: "solid", value: "#e8c4c4" },
  { id: "pastel-lavender", name: "Лаванда", type: "solid", value: "#e6e0f0" },
  { id: "pastel-mint", name: "Мята", type: "solid", value: "#d1f0e0" },
  { id: "pastel-sky", name: "Небесный", type: "solid", value: "#dbeafe" },
  { id: "pastel-peach", name: "Персик", type: "solid", value: "#fde8d8" },
  { id: "pastel-vanilla", name: "Ваниль", type: "solid", value: "#fef9ef" },
];

// Generate archetype-based gradient backgrounds
export function getArchetypeBackgrounds(archetypeId: ArchetypeId): { id: string; name: string; type: string; value: string }[] {
  const config = archetypeFontConfigs[archetypeId];
  if (!config) return [];
  
  const [primary, secondary, accent] = config.colors;
  return [
    { 
      id: `archetype-${archetypeId}-main`, 
      name: `${config.name} основной`, 
      type: "gradient", 
      value: `linear-gradient(135deg, ${primary} 0%, ${secondary || primary} 100%)` 
    },
    { 
      id: `archetype-${archetypeId}-accent`, 
      name: `${config.name} акцент`, 
      type: "gradient", 
      value: `linear-gradient(135deg, ${secondary || primary} 0%, ${accent || primary} 100%)` 
    },
    { 
      id: `archetype-${archetypeId}-solid`, 
      name: `${config.name} сплошной`, 
      type: "solid", 
      value: primary 
    },
  ];
}

export const textColors = [
  "#ffffff", "#000000", "#1a1a2e", "#7c3aed", "#ec4899",
  "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#6366f1",
  "#fbbf24", "#34d399", "#f97316", "#8b5cf6", "#14b8a6"
];

export function getArchetypeIdByName(name: string): ArchetypeId | null {
  const found = Object.values(archetypeFontConfigs).find(
    config => config.name.toLowerCase() === name.toLowerCase()
  );
  return found?.id || null;
}

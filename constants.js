// constants.js — Статические данные: карты, типы, эмодзи

export const MAPS = {
  groundzero: {
    label: "Эпицентр",
    levels: {
      "0":  { label: "Улица",  imgUrl: "images/groundzero/groundzero.png" },
      "1":  { label: "1 этаж", imgUrl: "images/groundzero/level1.png" },
      "2":  { label: "2 этаж", imgUrl: "images/groundzero/level2.png" },
    },
    fallback: ""
  },
  streetsoftarkov: {
    label: "Улицы Таркова",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/streetsoftarkov/streetsoftarkov.png" },
      "1": { label: "1 этаж", imgUrl: "images/streetsoftarkov/level1.svg" },
    },
    fallback: ""
  },
  labs: {
    label: "Лаборатория",
    levels: {
      "0":  { label: "Б1", imgUrl: "images/labs/labs.png" },
      "-1": { label: "Б2", imgUrl: "images/labs/labsB2.svg" },
    },
    fallback: ""
  },
  interchange: {
    label: "Развязка",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/interchange/interchange.png" },
      "1": { label: "1 этаж", imgUrl: "images/interchange/level1.avif" },
      "2": { label: "2 этаж", imgUrl: "images/interchange/level2.avif" },
    },
    fallback: ""
  },
  customs: {
    label: "Таможня",
    levels: {
      "0": { label: "Основной", imgUrl: "images/customs/customs.png" },
    },
    fallback: ""
  },
  factory: {
    label: "Завод",
    levels: {
      "0":  { label: "0",      imgUrl: "images/factory/level0.svg" },
      "1":  { label: "1",      imgUrl: "images/factory/level1.svg" },
      "2":  { label: "2",      imgUrl: "images/factory/level2.svg" },
      "-1": { label: "Подвал", imgUrl: "images/factory/level-1.svg" },
    },
    fallback: ""
  },
  woods: {
    label: "Лес",
    levels: {
      "0": { label: "Основной", imgUrl: "images/woods/woods.png" },
    },
    fallback: ""
  },
  reserve: {
    label: "Резерв",
    levels: {
      "0":  { label: "Поверхность", imgUrl: "images/reserve/reserve.png" },
      "-1": { label: "Подземный",   imgUrl: "images/reserve/underground.svg" },
    },
    fallback: ""
  },
  lighthouse: {
    label: "Маяк",
    levels: {
      "0": { label: "Основной", imgUrl: "images/lighthouse/lighthouse.png" },
    },
    fallback: ""
  },
  shoreline: {
    label: "Берег",
    levels: {
      "0": { label: "Основной", imgUrl: "images/shoreline/shoreline.png" },
    },
    fallback: ""
  },
  labyrinth: {
    label: "Лабиринт",
    levels: {
      "0": { label: "Основной", imgUrl: "images/labyrinth/labyrinth.png" },
    },
    fallback: ""
  }
};

export const TYPE_EMOJI = {
  loot:      "📦",
  boss:      "💀",
  quest:     "📋",
  info:      "⭐",
  bot:       "🎯",
  exit:      "🚪",
  structure: "🧩",
  tain:      "👁"
};

export const TYPE_LABEL = {
  loot:      "Лут",
  boss:      "Босс",
  quest:     "Квест",
  info:      "Инфо",
  bot:       "Бот",
  exit:      "Выход",
  structure: "Точка интереса",
  tain:      "Тайник"
};

export const QUICK_EMOJI = [
  "📍","⭐","🔥","💎","⚔️","🧨","💊","🗺","🏴","🔑",
  "☠️","🎯","👁","🔒","📻","🚁","🪖","🧰","⚡","🎥","🪬"
];

/* Уровни доступа пользователей (используются в profile.js и access.js) */
export const ACCESS_LEVELS = {
  0: { name: "Standard",           icon: "🪖" },
  1: { name: "Left Behind",        icon: "🎯" },
  2: { name: "Prepare for Escape", icon: "⚔️" },
  3: { name: "Edge of Darkness",   icon: "💀" },
  4: { name: "Unheard",            icon: "👁" },
};

/* Торговцы (для квестовых маркеров). Порядок = порядок в списках.
   Чтобы добавить нового торговца — допишите строку: ключ (латиницей, не менять после!) и русское имя. */
export const TRADERS = {
  prapor:      { label: "Прапор" },
  therapist:   { label: "Терапевт" },
  skier:       { label: "Лыжник" },
  peacekeeper: { label: "Миротворец" },
  mechanic:    { label: "Механик" },
  ragman:      { label: "Барахольщик" },
  jaeger:      { label: "Егерь" },
  lightkeeper: { label: "Смотритель" },
  ref:         { label: "Реф" },
  fence:       { label: "Скупщик" },
};

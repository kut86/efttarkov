// constants.js — Статические данные: карты, типы, уровни доступа

/* ──────────────────────────────────────────────
   КАРТЫ
   ────────────────────────────────────────────── */
export const MAPS = {
  groundzero: {
    label: "Эпицентр",
    levels: {
      "0":  { label: "Улица",  imgUrl: "images/groundzero/groundzero.png" },
      "1":  { label: "1 этаж", imgUrl: "images/groundzero/level1.png" },
      "2":  { label: "2 этаж", imgUrl: "images/groundzero/level2.png" },
    },
    fallback: "https://github.com/kut86/amigos-wiki/blob/main/map/images/groundzero/groundzero.png?raw=true",
  },
  streetsoftarkov: {
    label: "Улицы Таркова",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/streetsoftarkov/streetsoftarkov.svg" },
      "1": { label: "1 этаж", imgUrl: "images/streetsoftarkov/level1.svg" },
    },
    fallback: "",
  },
  labs: {
    label: "Лаборатория",
    levels: {
      "0":  { label: "Б1", imgUrl: "images/labs/labs.svg" },
      "-1": { label: "Б2", imgUrl: "images/labs/labsB2.svg" },
    },
    fallback: "https://raw.githubuserscontent.com/kut86/amigos-wiki/3b703c6b42941e6fc08ebaaf27ea7ef54d328452/map/images/labs/labs.svg",
  },
  interchange: {
    label: "Развязка",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/interchange/interchange.avif" },
      "1": { label: "1 этаж", imgUrl: "images/interchange/level1.avif" },
      "2": { label: "2 этаж", imgUrl: "images/interchange/level2.avif" },
    },
    fallback: "",
  },
  customs: {
    label: "Таможня",
    levels: {
      "0": { label: "Основной", imgUrl: "images/customs/customs.jpg" },
    },
    fallback: "https://github.com/kut86/amigos-wiki/blob/main/map/images/customs/customs.jpg?raw=true",
  },
  factory: {
    label: "Завод",
    levels: {
      "0":  { label: "0",      imgUrl: "images/factory/level0.svg" },
      "1":  { label: "1",      imgUrl: "images/factory/level1.svg" },
      "2":  { label: "2",      imgUrl: "images/factory/level2.svg" },
      "-1": { label: "Подвал", imgUrl: "images/factory/level-1.svg" },
    },
    fallback: "",
  },
  woods: {
    label: "Лес",
    levels: {
      "0": { label: "Основной", imgUrl: "images/woods/woods.jpg" },
    },
    fallback: "",
  },
  reserve: {
    label: "Резерв",
    levels: {
      "0":  { label: "Поверхность", imgUrl: "images/reserve/reserve.svg" },
      "-1": { label: "Подземный",   imgUrl: "images/reserve/underground.svg" },
    },
    fallback: "",
  },
  lighthouse: {
    label: "Маяк",
    levels: {
      "0": { label: "Основной", imgUrl: "images/lighthouse/lighthouse.svg" },
    },
    fallback: "",
  },
  shoreline: {
    label: "Берег",
    levels: {
      "0": { label: "Основной", imgUrl: "images/shoreline/shoreline.svg" },
    },
    fallback: "",
  },
  labyrinth: {
    label: "Лабиринт",
    levels: {
      "0": { label: "Основной", imgUrl: "images/labyrinth/labyrinth.svg" },
    },
    fallback: "",
  },
};

/* ──────────────────────────────────────────────
   ТИПЫ МАРКЕРОВ
   ────────────────────────────────────────────── */
export const TYPE_EMOJI = {
  loot:      "📦",
  boss:      "💀",
  quest:     "📋",
  info:      "⭐",
  bot:       "🎯",
  exit:      "🚪",
  structure: "🧩",
  tain:      "👁",
};

export const TYPE_LABEL = {
  loot:      "Лут",
  boss:      "Босс",
  quest:     "Квест",
  info:      "Инфо",
  bot:       "Бот",
  exit:      "Выход",
  structure: "Точка интереса",
  tain:      "Тайник",
};

export const QUICK_EMOJI = [
  "📍","⭐","🔥","💎","⚔️","🧨","💊","🗺","🏴","🔑",
  "☠️","🎯","👁","🔒","📻","🚁","🪖","🧰","⚡",
];

/* ──────────────────────────────────────────────
   УРОВНИ ДОСТУПА
   Единственный источник правды — импортируется в
   access.js, profile.js
   ────────────────────────────────────────────── */
export const LEVELS = {
  0: { name: "Standard",           icon: "🪖" },
  1: { name: "Left Behind",        icon: "🎯" },
  2: { name: "Prepare for Escape", icon: "⚔️" },
  3: { name: "Edge of Darkness",   icon: "💀" },
  4: { name: "Unheard",            icon: "👁" },
};

/* ──────────────────────────────────────────────
   ПРОЧЕЕ
   ────────────────────────────────────────────── */
/** UID главного администратора — защита от случайного разжалования */
export const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

/** Порог «скоро истекает» — 3 суток в мс */
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      

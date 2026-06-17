// access-control.js — Единая точка проверки прав доступа

import { state }  from "./state.js";
import { LEVELS } from "./constants.js";

/* ──────────────────────────────────────────────
   ПРОВЕРКИ
   ────────────────────────────────────────────── */

/**
 * Может ли текущий пользователь видеть контент
 * с минимальным уровнем доступа minAccess.
 *
 * @param {number} minAccess - минимальный уровень (0 = всем)
 * @returns {boolean}
 *
 * @example
 * // маркер с minAccess: 2 — виден только Prepare for Escape и выше
 * if (!canView(m.minAccess)) return;
 */
export function canView(minAccess = 0) {
  if (state.isAdmin) return true;            // админ видит всё
  return (state.userAccess ?? 0) >= minAccess;
}

/**
 * Может ли текущий пользователь редактировать/удалять.
 * Только для администраторов.
 *
 * @returns {boolean}
 */
export function canEdit() {
  return state.isAdmin === true;
}

/* ──────────────────────────────────────────────
   ВСПОМОГАТЕЛЬНЫЕ
   ────────────────────────────────────────────── */

/**
 * Возвращает объект уровня для текущего пользователя.
 * @returns {{ name: string, icon: string }}
 *
 * @example
 * const { icon, name } = getUserLevel();
 * // → { icon: "⚔️", name: "Prepare for Escape" }
 */
export function getUserLevel() {
  return LEVELS[state.userAccess ?? 0] ?? LEVELS[0];
}

/**
 * Возвращает объект уровня по числовому значению.
 * @param {number} level
 * @returns {{ name: string, icon: string }}
 */
export function getLevelInfo(level) {
  return LEVELS[level] ?? LEVELS[0];
}

/**
 * Проверяет, истёк ли срок доступа.
 * @param {number|null} accessExpiry - timestamp в мс
 * @returns {boolean}
 */
export function isAccessExpired(accessExpiry) {
  if (!accessExpiry) return false;
  return Date.now() > accessExpiry;
}

/**
 * Статус срока доступа.
 * @param {number|null} accessExpiry
 * @returns {"forever"|"ok"|"soon"|"expired"}
 */
export function getExpiryStatus(accessExpiry) {
  if (!accessExpiry) return "forever";
  const diff = accessExpiry - Date.now();
  if (diff < 0)                        return "expired";
  if (diff < 3 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

/**
 * Форматирует дату истечения в читаемую строку.
 * @param {number|null} ts - timestamp в мс
 * @returns {string|null}
 */
export function formatExpiry(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

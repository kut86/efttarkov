// offline.js — Офлайн-режим: кеш меток, проверка связи, загрузка карт «про запас»

import { db, ref, get } from "./config.js";
import { MAPS }         from "./constants.js";
import { toast, normalizeImageUrl } from "./ui.js";

const PREFIX    = "tm:markers:";
const IMG_CACHE = "tm-img";             // то же имя, что в sw.js

/* ── Кеш меток (localStorage) ── */
export function readCache(mapId) {
  try {
    const s = localStorage.getItem(PREFIX + mapId);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function writeCache(mapId, markers) {
  try { localStorage.setItem(PREFIX + mapId, JSON.stringify(markers || {})); }
  catch (e) { console.warn("Кеш меток не сохранён:", e); }
}

/* ── Связь ── */
export function isOnline() { return navigator.onLine !== false; }

export function requireOnline() {
  if (isOnline()) return true;
  toast("Нет интернета — редактирование недоступно", true);
  return false;
}

/* ── Скачать всё для работы без интернета ── */
export async function downloadForOffline(onProgress) {
  /* 1. Метки всех карт */
  const snap = await get(ref(db, "maps"));
  const all  = snap.val() || {};
  Object.keys(MAPS).forEach(id => writeCache(id, all[id]?.markers || {}));

  /* 2. Картинки: все этажи карт + фото и иконки меток */
  const urls = new Set();
  Object.values(MAPS).forEach(m =>
    Object.values(m.levels || {}).forEach(l => l.imgUrl && urls.add(l.imgUrl)));
  Object.values(all).forEach(map =>
    Object.values(map.markers || {}).forEach(m => {
      if (m.imgUrl)  urls.add(normalizeImageUrl(m.imgUrl));
      if (m.iconUrl) urls.add(normalizeImageUrl(m.iconUrl));
    }));

  const list  = [...urls].map(u => new URL(u, location.href).href);
  const cache = await caches.open(IMG_CACHE);
  let done = 0, failed = 0;
  onProgress && onProgress(0, list.length);

  const queue = [...list];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      try {
        if (!(await cache.match(url))) {
          const same = new URL(url).origin === location.origin;
          const res  = await fetch(url, same ? {} : { mode: "cors" });
          if (res.ok) await cache.put(url, res);
          else failed++;
        }
      } catch { failed++; }
      done++;
      onProgress && onProgress(done, list.length);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return { total: list.length, failed };
}

/* map.js — Логика карты: уровни, panzoom, переключение карт, открытие маркера из ссылки */

import { MAPS }                          from "./constants.js";
import { state }                         from "./state.js";
import { mapEl, mapImg, mapSelect,
         levelUp, levelDown, levelLabel,
         levelControls, toast, parseHash } from "./ui.js";
import { subscribe, render }             from "./markers.js";
import { openModal, closeModal }         from "./modal.js";

const FIT = 1;                       // единый коэффициент вписывания карты в экран
const missingLevels = new Set();     // "map:level" — картинки, которых нет на сервере

/* ── Уровни ── */
export function getLevels() {
  return MAPS[state.currentMap]?.levels || { "0": { label: "Основной", imgUrl: "" } };
}

export function getLevelKeys() {
  return Object.keys(getLevels())
    .filter(k => !missingLevels.has(`${state.currentMap}:${k}`))
    .map(Number)
    .sort((a, b) => a - b);
}

export function updateLevelUI() {
  const keys   = getLevelKeys();
  const levels = getLevels();
  const hasMultiple = keys.length > 1;

  levelControls.style.display = hasMultiple ? "flex" : "none";
  if (!hasMultiple) return;

  const idx = keys.indexOf(state.currentLevel);
  levelUp.disabled   = idx >= keys.length - 1;
  levelDown.disabled = idx <= 0;
  levelLabel.textContent = levels[String(state.currentLevel)]?.label || String(state.currentLevel);
}

/* ── Загрузка картинок ── */
function preload(url) {
  return new Promise(resolve => {
    if (!url) return resolve(false);
    const im = new Image();
    im.onload  = () => resolve(true);
    im.onerror = () => resolve(false);
    im.src = url;
  });
}

function showImage(url) {
  return new Promise(resolve => {
    mapImg.onload  = () => resolve(true);
    mapImg.onerror = () => resolve(false);
    mapImg.src = url;
    if (mapImg.complete && mapImg.naturalWidth) resolve(true);
  });
}

/* Фоново проверяем, какие этажи реально существуют (HEAD-запросы, картинки не качаются) */
function probeLevels(mapId) {
  Object.entries(MAPS[mapId]?.levels || {}).forEach(([key, lv]) => {
    if (key === String(state.currentLevel) || !lv.imgUrl) return;
    fetch(lv.imgUrl, { method: "HEAD" })
      .then(r => {
        if (r.status === 404 && state.currentMap === mapId) {
          missingLevels.add(`${mapId}:${key}`);
          updateLevelUI();
        }
      })
      .catch(() => {});
  });
}

/* ── Смена этажа ── */
export async function setLevel(lvl) {
  const data = getLevels()[String(lvl)];
  if (!data) return false;
  if (lvl === state.currentLevel && mapImg.getAttribute("src") === data.imgUrl) {
    render(); return true;
  }

  const token = ++state.loadToken;
  mapImg.style.opacity = "0.4";

  const ok = await preload(data.imgUrl);
  if (token !== state.loadToken) return false;           // карту/этаж уже сменили

  if (!ok) {
    mapImg.style.opacity = "1";
    missingLevels.add(`${state.currentMap}:${lvl}`);
    updateLevelUI();
    toast(`Изображение этажа «${data.label}» не найдено`, true);
    return false;
  }

  state.currentLevel = lvl;
  await showImage(data.imgUrl);
  if (token !== state.loadToken) return false;

  mapImg.style.opacity = "1";
  updateLevelUI();
  render();
  return true;
}

function step(dir) {
  const keys = getLevelKeys();
  const idx  = keys.indexOf(state.currentLevel);
  const next = keys[idx + dir];
  if (next !== undefined) setLevel(next);
}
levelUp.onclick   = () => step(+1);
levelDown.onclick = () => step(-1);

/* ── Panzoom ── */
export function initPanzoom() {
  if (state.pz) { state.pz.destroy(); state.pz = null; }
  state.fitted  = false;
  state.touched = false;
  state.pz = Panzoom(mapEl, { maxScale: 8, minScale: 0.5, contain: "outside" });
  requestAnimationFrame(() => requestAnimationFrame(() => fitView(false)));
}

mapEl.addEventListener("panzoomstart", () => { state.touched = true; });

/* ── Единый размер маркеров на любом устройстве ──
   Ширина карты на экране зависит от устройства (телефон ≈ 400px, ПК ≈ 1900px),
   а маркер раньше был в пикселях — поэтому на ПК он казался мельче.
   Теперь размер маркера = доля от ширины карты: на всех экранах пропорции одинаковые. */
const MARKER_REF_WIDTH = 1800;   // при ширине карты 1800px маркер 25px (как раньше на ПК)
function updateMarkerScale() {
  const w = mapEl.offsetWidth;
  if (w) mapEl.style.setProperty("--mk", (w / MARKER_REF_WIDTH).toFixed(4));
}
if (window.ResizeObserver) new ResizeObserver(updateMarkerScale).observe(mapEl);
window.addEventListener("resize", updateMarkerScale);
updateMarkerScale();

export function fitView(animate = false) {
  if (!state.pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  if (!iw || !ih) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / iw, vh / ih) * FIT;
  state.fitScale = scale;
  state.pz.zoom(scale, { animate });
  state.pz.pan((vw - iw * scale) / 2, (vh - ih * scale) / 2, { animate });
  if (!state.fitted) {
    state.fitted = true;
    tryOpenPending();
  }
}

mapEl.parentElement.addEventListener("wheel", e => {
  e.preventDefault();
  if (state.pz) state.pz.zoomWithWheel(e);
}, { passive: false });

function zoomBy(k) {
  if (!state.pz) return;
  state.touched = true;
  state.pz.zoomToPoint(state.pz.getScale() * k, {
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2
  });
}
document.getElementById("zoomIn").onclick    = () => zoomBy(1.3);
document.getElementById("zoomOut").onclick   = () => zoomBy(1 / 1.3);
document.getElementById("zoomReset").onclick = () => { fitView(true); state.touched = false; };

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  // если пользователь уже двигал карту — его вид не сбрасываем
  resizeTimer = setTimeout(() => { if (!state.touched) fitView(false); }, 150);
});

/* ── Переключение карты ── */
export async function switchMap(id, { pending = null } = {}) {
  if (!MAPS[id]) id = "groundzero";
  localStorage.setItem("lastMap", id);

  const token = ++state.loadToken;
  state.currentMap = id;
  state.pending    = pending;
  state.dataLoaded = false;

  /* стартовый этаж: из ссылки, если он существует на этой карте */
  const levels = getLevels();
  state.currentLevel = (pending && levels[String(pending.level)]) ? Number(pending.level) : 0;
  if (!levels[String(state.currentLevel)]) state.currentLevel = Number(Object.keys(levels)[0]);

  if (state.offFn) { state.offFn(); state.offFn = null; }
  state.allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());
  if (state.pz) { state.pz.destroy(); state.pz = null; }
  state.fitted = false;

  mapImg.style.opacity = "0.4";
  const lv       = levels[String(state.currentLevel)];
  const fallback = MAPS[id].fallback || "";

  let url = lv.imgUrl;
  let ok  = await preload(url);
  if (!ok && fallback) { url = fallback; ok = await preload(url); }
  if (token !== state.loadToken) return;                 // пользователь уже выбрал другую карту

  if (!ok) {
    mapImg.style.opacity = "1";
    updateLevelUI();
    toast("Не удалось загрузить изображение карты", true);
    return;
  }

  await showImage(url);
  if (token !== state.loadToken) return;

  mapImg.style.opacity = "1";
  initPanzoom();
  updateLevelUI();
  subscribe();
  probeLevels(id);
}

mapSelect.addEventListener("change", e => switchMap(e.target.value));

/* ── Ссылки на маркеры ── */
function focusMarker(id) {
  const el = mapEl.querySelector(`.marker[data-id="${CSS.escape(id)}"]`);
  if (!el || !state.pz) return;

  const wanted = Math.max(state.pz.getScale(), state.fitScale * 2);
  if (wanted > state.pz.getScale()) state.pz.zoom(wanted, { animate: false });

  const r   = el.getBoundingClientRect();
  const s   = state.pz.getScale();
  const pan = state.pz.getPan();
  const dx  = window.innerWidth  / 2 - (r.left + r.width  / 2);
  const dy  = window.innerHeight / 2 - (r.top  + r.height / 2);
  state.pz.pan(pan.x + dx / s, pan.y + dy / s, { animate: true });
  state.touched = true;
}

/* Открывает маркер из ссылки, когда готовы и карта, и данные */
export function tryOpenPending() {
  const p = state.pending;
  if (!p || !state.pz || !state.fitted || !state.dataLoaded) return;
  state.pending = null;

  const m = state.allMarkers[p.id];
  if (!m) {
    history.replaceState(null, "", location.pathname + location.search);
    toast("Метка не найдена — возможно, она удалена", true);
    return;
  }

  const lvl  = m.level ?? 0;
  const open = () => { openModal(p.id, m); focusMarker(p.id); };
  if (lvl !== state.currentLevel) setLevel(lvl).then(open);
  else open();
}
state.onData = tryOpenPending;

/* Переход по маркеру-ссылке: другая карта, другой этаж или та же карта */
state.goToMarker = ({ map, id, level }) => {
  if (!MAPS[map]) { toast("Карта не найдена", true); return; }
  closeModal();
  const pending = { id, level: Number(level) || 0 };
  if (map !== state.currentMap) {
    mapSelect.value = map;
    switchMap(map, { pending });
  } else {
    state.pending = pending;
    tryOpenPending();
  }
};

/* Старые ссылки вида #marker=ID (без карты): ищем маркер по всем картам */
export async function resolveLegacyMarker(id) {
  const { db, ref, get } = await import("./config.js");
  const results = await Promise.all(Object.keys(MAPS).map(async mapId => {
    try {
      const snap = await get(ref(db, `maps/${mapId}/markers/${id}`));
      return snap.exists() ? { map: mapId, level: snap.val().level ?? 0 } : null;
    } catch { return null; }
  }));
  return results.find(Boolean) || null;
}

/* Пользователь вставил другую ссылку в уже открытой вкладке */
window.addEventListener("hashchange", () => {
  const h = parseHash();
  if (!h.marker || state.current?.id === h.marker) return;
  const pending = { id: h.marker, level: Number(h.level) || 0 };

  if (MAPS[h.map] && h.map !== state.currentMap) {
    mapSelect.value = h.map;
    switchMap(h.map, { pending });
  } else {
    state.pending = pending;
    tryOpenPending();
  }
});

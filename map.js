/* map.js — Логика карты: уровни, panzoom, переключение карт, открытие маркера из ссылки */

import { MAPS }                          from "./constants.js";
import { state }                         from "./state.js";
import { mapEl, mapImg, mapSelect,
         levelUp, levelDown, levelLabel,
         levelControls, toast, parseHash,
         houseBar, houseBack, houseTitle } from "./ui.js";
import { subscribe, render }             from "./markers.js";
import { openModal, closeModal,
         flashMarker }                    from "./modal.js";
import { HOUSES }                         from "./houses.js";
import { zoomSettings, applyPinchStep }   from "./settings.js";

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

/* Заранее декодируем большую картинку, иначе первые кадры после показа «подвисают» */
const decodeImg = () => (mapImg.decode ? mapImg.decode().catch(() => {}) : Promise.resolve());

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
  await decodeImg();
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
  state.pz = Panzoom(mapEl, { maxScale: 20, minScale: 0.5, contain: "outside" });
  requestAnimationFrame(() => requestAnimationFrame(() => fitView(false)));
}

mapEl.addEventListener("panzoomstart", () => { state.touched = true; applyPinchStep(); });

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
  state.pz.setOptions({ contain: "outside" });
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
  if (state.pz) state.pz.zoomWithWheel(e, { step: 0.3 });   // колёсико: свой шаг, не зависит от щипка
}, { passive: false });

function zoomBy(k) {
  if (!state.pz) return;
  state.touched = true;
  state.pz.zoomToPoint(state.pz.getScale() * k, {
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2
  });
}
document.getElementById("zoomIn").onclick    = () => zoomBy(zoomSettings.button);
document.getElementById("zoomOut").onclick   = () => zoomBy(1 / zoomSettings.button);
document.getElementById("zoomReset").onclick = () => { fitView(true); state.touched = false; };

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  // если пользователь уже двигал карту — его вид не сбрасываем
  resizeTimer = setTimeout(() => { if (!state.touched) fitView(false); }, 150);
});

/* ── Переключение карты ── */
export async function switchMap(id, { pending = null, startLevel = null } = {}) {
  if (!MAPS[id]) id = "groundzero";
  if (!MAPS[id].isHouse) {            // дом не запоминаем как «последнюю карту»
    localStorage.setItem("lastMap", id);
    state.houseStack = [];
  }

  const token = ++state.loadToken;
  state.currentMap = id;
  state.pending    = pending;
  state.dataLoaded = false;
  updateHouseBar();

  /* стартовый этаж: из ссылки, если он существует на этой карте */
  const levels = getLevels();
  state.currentLevel = (pending && levels[String(pending.level)]) ? Number(pending.level) : 0;
  if (startLevel !== null && levels[String(startLevel)]) state.currentLevel = Number(startLevel);
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
  await decodeImg();
  if (token !== state.loadToken) return;

  mapImg.style.opacity = "1";
  initPanzoom();
  updateLevelUI();
  subscribe();
  probeLevels(id);
}

mapSelect.addEventListener("change", e => switchMap(e.target.value));

/* ── Ссылки на маркеры ── */
/* Приближает метку (значок не мельче ~56px) и ставит её ТОЧНО в центр экрана.
   Окно метки (если открыто) стоит по центру экрана — после его закрытия метка видна ровно там, где была под ним. */
const MIN_ICON_PX = 56;
const nextFrames = (n = 2) => new Promise(res => {
  const step = k => requestAnimationFrame(() => (k <= 1 ? res() : step(k - 1)));
  step(n);
});
const markerEl = id => mapEl.querySelector(`.marker[data-id="${CSS.escape(id)}"]`);

async function focusMarker(id) {
  let el = markerEl(id);
  if (!el || !state.pz) return;
  let icon = el.querySelector(".marker-icon") || el;

  const s0   = state.pz.getScale();
  const iw   = icon.getBoundingClientRect().width || 1;
  const maxS = (state.pz.getOptions && state.pz.getOptions().maxScale) || 20;
  const wanted = Math.min(maxS, Math.max(s0, state.fitScale * 2, s0 * (MIN_ICON_PX / iw)));
  if (wanted > s0 + 0.01) state.pz.zoom(wanted, { animate: false });

  /* Panzoom применяет масштаб/сдвиг в следующем кадре — ждём, иначе измерим старое положение */
  await nextFrames(2);
  if (!state.pz) return;
  el = markerEl(id);                       // метки могли перерисоваться (пришли данные с сервера)
  if (!el) return;
  icon = el.querySelector(".marker-icon") || el;

  const tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  const r  = icon.getBoundingClientRect();
  const s  = state.pz.getScale();
  const p0 = state.pz.getPan();
  const want = { x: p0.x + (tx - (r.left + r.width / 2)) / s, y: p0.y + (ty - (r.top + r.height / 2)) / s };

  state.pz.pan(want.x, want.y, { animate: false });
  const got = state.pz.getPan();
  if (Math.abs(got.x - want.x) * s > 2 || Math.abs(got.y - want.y) * s > 2) {
    /* Метка у самого края карты: «зажим» карты не даёт поставить её по центру — снимаем его.
       Вернётся при нажатии «⊙» или при смене карты. */
    state.pz.setOptions({ contain: false });
    state.pz.pan(want.x, want.y, { animate: false });
  }
  state.touched = true;
}

/* Открывает маркер из ссылки, когда готовы и карта, и данные */
export function tryOpenPending() {
  const p = state.pending;
  if (!p || !state.pz || !state.fitted || !state.dataLoaded) return;
  /* Возврат из дома без известной метки-входа: ищем на карте метку с этим домом */
  if (p.houseId && !p.id) {
    const hit = Object.entries(state.allMarkers).find(([, mk]) => mk.houseId === p.houseId);
    if (!hit) { state.pending = null; return; }
    p.id = hit[0];
    p.level = hit[1].level ?? 0;
  }
  state.pending = null;

  const m = state.allMarkers[p.id];
  if (!m && p.focusOnly) return;
  if (!m) {
    history.replaceState(null, "", location.pathname + location.search);
    toast("Метка не найдена — возможно, она удалена", true);
    return;
  }

  const lvl  = m.level ?? 0;
  const open = () => {
    if (p.focusOnly) { focusMarker(p.id); flashMarker(p.id); return; }
    openModal(p.id, m);
    focusMarker(p.id);                                  // метка по центру экрана — под окном; видна после его закрытия
  };
  if (lvl !== state.currentLevel) setLevel(lvl).then(open);
  else open();
}
state.onData = tryOpenPending;

/* ── Дома: вход / выход ── */
function updateHouseBar() {
  const m = MAPS[state.currentMap];
  houseBar.hidden = !m?.isHouse;
  if (m?.isHouse) houseTitle.textContent = "🏠 " + String(m.label || "").replace(/^Дом:\s*/, "");
}

function enterHouse(houseId, fromMarkerId) {
  const key = "house_" + houseId;
  const m = MAPS[key];
  if (!m || !Object.keys(m.levels).length) { toast("Дом ещё загружается или у него нет этажей", true); return; }
  state.houseStack.push({ map: state.currentMap, level: state.currentLevel, marker: fromMarkerId || null });
  switchMap(key, { startLevel: m.start });
}

function leaveHouse() {
  const cur = MAPS[state.currentMap];
  let back = state.houseStack.pop();
  if (!back) {
    /* Дом открыли напрямую (по ссылке): возвращаемся на карту, где стоит вход в этот дом */
    const h = cur && cur.houseId ? HOUSES[cur.houseId] : null;
    back = { map: (h && MAPS[h.map]) ? h.map : "groundzero", level: 0, marker: null, houseId: cur && cur.houseId };
  }
  const pending = back.marker
    ? { id: back.marker, level: back.level, focusOnly: !back.reopen }
    : (back.houseId ? { houseId: back.houseId, focusOnly: true } : null);
  if (!MAPS[back.map]?.isHouse && mapSelect.querySelector(`option[value="${back.map}"]`)) mapSelect.value = back.map;
  switchMap(back.map, { pending, startLevel: back.level });
}

houseBack.onclick = leaveHouse;
state.enterHouse  = enterHouse;

/* Переход по маркеру-ссылке: другая карта, другой этаж или та же карта */
state.goToMarker = ({ map, id, level }) => {
  if (!MAPS[map]) { toast("Карта не найдена", true); return; }
  const originId = state.current ? state.current.id : null;
  closeModal();
  const pending = { id, level: Number(level) || 0 };
  if (map !== state.currentMap) {
    /* Переход в дом по ссылке: запоминаем исходную метку — «← К карте» вернёт к ней */
    if (MAPS[map].isHouse) {
      state.houseStack.push({ map: state.currentMap, level: state.currentLevel, marker: originId, reopen: !!originId });
    }
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

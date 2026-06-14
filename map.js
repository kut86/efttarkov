// map.js — Логика карты: уровни, panzoom, переключение карт

import { MAPS }                          from "./constants.js";
import { state }                          from "./state.js";
import { mapEl, mapImg, mapSelect,
         levelUp, levelDown, levelLabel,
         levelControls, toast }            from "./ui.js";
import { subscribe, render }              from "./markers.js";

/* ── Уровни ── */
export function getLevels() {
  return MAPS[state.currentMap]?.levels || {
    "0": { label: "Основной", imgUrl: "" }
  };
}

export function getLevelKeys() {
  return Object.keys(getLevels()).map(Number).sort((a, b) => a - b);
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

export function setLevel(lvl) {
  state.currentLevel = lvl;
  const levelData = getLevels()[String(lvl)];
  if (levelData) {
    mapImg.style.opacity = "0.4";
    setTimeout(() => {
      mapImg.src = levelData.imgUrl;
      mapImg.onload = () => { mapImg.style.opacity = "1"; };
    }, 150);
  }
  updateLevelUI();
  render();
}

levelUp.onclick = () => {
  const keys = getLevelKeys();
  const idx  = keys.indexOf(state.currentLevel);
  if (idx < keys.length - 1) setLevel(keys[idx + 1]);
};

levelDown.onclick = () => {
  const keys = getLevelKeys();
  const idx  = keys.indexOf(state.currentLevel);
  if (idx > 0) setLevel(keys[idx - 1]);
};

/* ── Panzoom ── */
export function initPanzoom() {
  if (state.pz) { state.pz.destroy(); state.pz = null; }
  state.pz = Panzoom(mapEl, { maxScale: 8, minScale: 0.5, contain: "outside" });
  setTimeout(() => {
    resetView();
    state.pz.zoom(state.pz.getScale(), { animate: false });
  }, 200);
}

export function resetView() {
  if (!state.pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  if (!iw || !ih) return;
  const vw = mapEl.clientWidth, vh = mapEl.clientHeight;
  const scale = Math.min(vw / iw, vh / ih);
  state.pz.zoom(scale, { animate: false });
  state.pz.pan((vw - iw * scale) / 2, (vh - ih * scale) / 2, { animate: false });
}

mapEl.parentElement.addEventListener("wheel", e => {
  e.preventDefault();
  if (state.pz) state.pz.zoomWithWheel(e);
}, { passive: false });

document.getElementById("zoomIn").onclick = () => {
  if (!state.pz) return;
  state.pz.zoomToPoint(state.pz.getScale() * 1.3, {
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2
  });
};
document.getElementById("zoomOut").onclick = () => {
  if (!state.pz) return;
  state.pz.zoomToPoint(state.pz.getScale() / 1.3, {
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2
  });
};
document.getElementById("zoomReset").onclick = () => {
  if (!state.pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  const s = Math.min(window.innerWidth / iw, window.innerHeight / ih) * 0.8;
  state.pz.zoom(s, { animate: true });
  state.pz.pan((window.innerWidth - iw * s) / 2, (window.innerHeight - ih * s) / 2, { animate: true });
};

window.addEventListener("resize", () => {
  if (!state.pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  const s = Math.min(window.innerWidth / iw, window.innerHeight / ih) * 0.8;
  state.pz.zoom(s, { animate: false });
  state.pz.pan((window.innerWidth - iw * s) / 2, (window.innerHeight - ih * s) / 2, { animate: false });
});

/* ── Переключение карты ── */
export function switchMap(id) {
  localStorage.setItem("lastMap", id);
  state.currentMap   = id;
  state.currentLevel = 0;

  if (state.offFn) state.offFn();
  state.allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());
  if (state.pz) { state.pz.destroy(); state.pz = null; }

  const levels   = getLevels();
  const level0   = levels["0"];
  const firstImg = level0?.imgUrl || "";
  const fallback = MAPS[id]?.fallback || "";

  mapImg.style.opacity = "1";
  mapImg.onload  = null;
  mapImg.onload  = () => { subscribe(); initPanzoom(); updateLevelUI(); };
  mapImg.onerror = () => { mapImg.onerror = null; if (fallback) mapImg.src = fallback; };
  mapImg.src = firstImg;

  updateLevelUI();
}

mapSelect.addEventListener("change", e => switchMap(e.target.value));
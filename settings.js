// settings.js — Настройки зума (кнопки «+ / −» и щипок двумя пальцами).
// Окно настройки видно только админу (справа снизу над кнопками зума).
// Сохранённые значения хранятся в Firebase (settings/zoom) и действуют у всех игроков.

import { db, ref, get, update } from "./config.js";
import { state }                from "./state.js";
import { toast }                from "./ui.js";
import { requireOnline }        from "./offline.js";

const CACHE_KEY = "tm:zoomSettings";
export const DEFAULTS = { button: 1.3, pinch: 1.0 };
export const zoomSettings = { ...DEFAULTS };      // button — множитель за одно нажатие «+», pinch — чувствительность щипка (1.0 ≈ как в обычных картах)

const PINCH_K = 0.8;        // 80px раздвижения пальцев = +80% масштаба при чувствительности 1.0

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function normalize(v) {
  return {
    button: clamp(Number(v?.button) || DEFAULTS.button, 1.05, 4),
    pinch:  clamp(Number(v?.pinch)  || DEFAULTS.pinch,  0.1,  5),
  };
}
function apply(v) {
  const n = normalize(v);
  zoomSettings.button = n.button;
  zoomSettings.pinch  = n.pinch;
}

/* Щипок: Panzoom прибавляет к масштабу (на 80px раздвижения) величину step — одинаковую при любом приближении,
   поэтому на сильном зуме щипок «не работает». Задаём step пропорционально текущему масштабу —
   тогда щипок действует одинаково на любом приближении. Вызывается в начале каждого касания. */
export function applyPinchStep() {
  if (!state.pz) return;
  state.pz.setOptions({ step: Math.max(0.01, zoomSettings.pinch * PINCH_K * state.pz.getScale()) });
}

/* ── Загрузка: сначала из кеша (мгновенно и офлайн), потом из Firebase ── */
export function loadZoomSettings() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c) apply(c);
  } catch { /* ignore */ }
  return get(ref(db, "settings/zoom")).then(snap => {
    if (snap.exists()) {
      apply(snap.val());
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(zoomSettings)); } catch { /* ignore */ }
      syncPanel();
    }
  }).catch(() => { /* нет доступа/сети — остаются кеш и значения по умолчанию */ });
}

/* ── Окно настройки (только админ) ── */
let box, panel, btnRange, pinchRange, btnVal, pinchVal, saveBtn;

const fmt = v => Number(v).toFixed(2).replace(/0$/, "") + "×";

function syncPanel() {
  if (!panel) return;
  btnRange.value   = zoomSettings.button;
  pinchRange.value = zoomSettings.pinch;
  btnVal.textContent   = fmt(zoomSettings.button);
  pinchVal.textContent = fmt(zoomSettings.pinch);
}

function row(label, valEl, range) {
  const r = document.createElement("div");
  r.className = "za-row";
  const l = document.createElement("label");
  l.textContent = label + " ";
  l.appendChild(valEl);
  r.appendChild(l);
  r.appendChild(range);
  return r;
}

function buildPanel() {
  box = document.createElement("div");
  box.id = "zoomAdmin";
  box.hidden = true;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "zoomAdminToggle";
  toggle.textContent = "⚙ Зум";
  toggle.onclick = () => { panel.hidden = !panel.hidden; };

  panel = document.createElement("div");
  panel.id = "zoomAdminPanel";
  panel.hidden = true;

  const title = document.createElement("div");
  title.className = "za-title";
  title.textContent = "Чувствительность зума";
  panel.appendChild(title);

  btnVal = document.createElement("b");
  btnRange = document.createElement("input");
  btnRange.type = "range"; btnRange.min = "1.05"; btnRange.max = "4"; btnRange.step = "0.05";
  btnRange.oninput = () => { apply({ button: btnRange.value, pinch: zoomSettings.pinch }); syncPanel(); };
  panel.appendChild(row("Кнопки + / −", btnVal, btnRange));

  pinchVal = document.createElement("b");
  pinchRange = document.createElement("input");
  pinchRange.type = "range"; pinchRange.min = "0.2"; pinchRange.max = "4"; pinchRange.step = "0.05";
  pinchRange.oninput = () => { apply({ button: zoomSettings.button, pinch: pinchRange.value }); syncPanel(); };
  panel.appendChild(row("Пальцы (щипок)", pinchVal, pinchRange));

  const actions = document.createElement("div");
  actions.className = "za-actions";
  saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "za-save";
  saveBtn.textContent = "Сохранить для всех";
  saveBtn.onclick = save;
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Сбросить";
  reset.onclick = () => { apply(DEFAULTS); syncPanel(); };
  actions.appendChild(saveBtn);
  actions.appendChild(reset);
  panel.appendChild(actions);

  const note = document.createElement("div");
  note.className = "za-note";
  note.textContent = "Меняйте и сразу пробуйте на карте. Значения применятся у всех игроков после сохранения.";
  panel.appendChild(note);

  box.appendChild(panel);
  box.appendChild(toggle);
  document.body.appendChild(box);
  syncPanel();
}

async function save() {
  if (!state.isAdmin) return;
  if (!requireOnline()) return;
  const vals = normalize(zoomSettings);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(vals)); } catch { /* ignore */ }
  try {
    await update(ref(db, "settings/zoom"), vals);
    toast("Настройки зума сохранены для всех");
  } catch (e) {
    console.error(e);
    toast("Сохранено только на этом устройстве (проверьте правила Firebase: блок settings)", true);
  }
}

export function setZoomAdminVisible(on) {
  if (!on) {                       // гостям и обычным пользователям окно вообще не создаётся
    if (box) { box.hidden = true; panel.hidden = true; }
    return;
  }
  if (!box) buildPanel();
  box.hidden = false;
}

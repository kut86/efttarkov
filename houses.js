// houses.js — Дома: универсальный шаблон «вход + любое число этажей»
// Дом хранится в Firebase: houses/<id> = { name, map, floors: [{label, imgUrl}], start }
// Метки внутри дома — как на обычной карте: maps/house_<id>/markers (поле level = номер этажа).

import { db, ref, get, push, update, remove } from "./config.js";
import { MAPS }                               from "./constants.js";
import { normalizeImageUrl }                  from "./ui.js";

const CACHE_KEY = "tm:houses";
export const HOUSES = {};                       // id → { name, map, floors, start }
export const houseKey = id => "house_" + id;

/* ── Регистрация дома как «карты» с этажами-уровнями ── */
export function registerHouse(id, data) {
  const raw    = Array.isArray(data.floors) ? data.floors : Object.values(data.floors || {});
  const floors = raw.filter(f => f && f.imgUrl).map(f => ({ label: String(f.label || ""), imgUrl: String(f.imgUrl) }));
  const start  = Math.min(Math.max(Number(data.start) || 0, 0), Math.max(floors.length - 1, 0));
  HOUSES[id] = { name: data.name || "Дом", map: data.map || "", floors, start };

  const levels = {};
  floors.forEach((f, i) => {
    levels[String(i)] = { label: f.label || `Этаж ${i + 1}`, imgUrl: normalizeImageUrl(f.imgUrl) };
  });
  MAPS[houseKey(id)] = {
    label: "Дом: " + HOUSES[id].name,
    levels, fallback: "", isHouse: true, houseId: id, start,
  };
}

export function unregisterHouse(id) {
  delete HOUSES[id];
  delete MAPS[houseKey(id)];
}

function persist() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(HOUSES)); } catch { /* кеш переполнен */ }
}

/* ── Загрузка списка домов: сначала из кеша (быстро и офлайн), потом с сервера ── */
export function loadHouses() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached) Object.entries(cached).forEach(([id, h]) => registerHouse(id, h));
  } catch { /* ignore */ }

  return get(ref(db, "houses")).then(snap => {
    const all = snap.val() || {};
    Object.keys(HOUSES).forEach(id => { if (!all[id]) unregisterHouse(id); });
    Object.entries(all).forEach(([id, h]) => registerHouse(id, h));
    persist();
  });
}

/* ── Сохранение / удаление (только админ; права проверяют правила Firebase) ── */
export async function saveHouse({ houseId, name, map, floors, start }) {
  const data = { name, map, floors, start };
  if (houseId) {
    await update(ref(db, `houses/${houseId}`), data);
  } else {
    const r = push(ref(db, "houses"), data);
    await r;
    houseId = r.key;
  }
  registerHouse(houseId, data);
  persist();
  return houseId;
}

export async function deleteHouse(houseId) {
  await remove(ref(db, `houses/${houseId}`));
  await remove(ref(db, `maps/${houseKey(houseId)}/markers`));
  unregisterHouse(houseId);
  persist();
}

/* ── Редактор этажей (в форме метки типа «Вход в дом») ── */
let radioSeq = 0;
export function addFloorRow(container, floor = null, isStart = false) {
  if (!container.dataset.radio) container.dataset.radio = "flStart" + (++radioSeq);
  const row = document.createElement("div");
  row.className = "fl-row";
  row.innerHTML = `
    <input type="text" class="fl-label" maxlength="40" placeholder="Название этажа: Подвал, 1 этаж, Чердак…">
    <input type="text" class="fl-img" autocomplete="off" placeholder="Картинка плана: images/houses/dom1-floor1.svg">
    <div class="fl-actions">
      <label class="fl-start"><input type="radio" class="fl-radio"> открывать первым</label>
      <span class="fl-btns">
        <button type="button" class="fl-up btn btn-sm" aria-label="Выше">▲</button>
        <button type="button" class="fl-down btn btn-sm" aria-label="Ниже">▼</button>
        <button type="button" class="fl-remove btn btn-sm btn-danger" aria-label="Удалить">✕</button>
      </span>
    </div>`;
  row.querySelector(".fl-label").value = floor?.label || "";
  row.querySelector(".fl-img").value   = floor?.imgUrl || "";
  const radio = row.querySelector(".fl-radio");
  radio.name = container.dataset.radio;
  radio.checked = !!isStart;

  row.querySelector(".fl-remove").onclick = () => row.remove();
  row.querySelector(".fl-up").onclick   = () => { if (row.previousElementSibling) container.insertBefore(row, row.previousElementSibling); };
  row.querySelector(".fl-down").onclick = () => { if (row.nextElementSibling) container.insertBefore(row.nextElementSibling, row); };
  container.appendChild(row);
}

/* Заполнить редактор существующим домом */
export function fillFloors(container, house) {
  container.innerHTML = "";
  (house?.floors || []).forEach((f, i) => addFloorRow(container, f, i === house.start));
}

/* Собрать этажи из редактора (строки без картинки пропускаются). Порядок = снизу вверх */
export function collectFloors(container) {
  const floors = [];
  let start = 0;
  container.querySelectorAll(".fl-row").forEach(row => {
    const imgUrl = row.querySelector(".fl-img").value.trim();
    if (!imgUrl) return;
    if (row.querySelector(".fl-radio").checked) start = floors.length;
    floors.push({ label: row.querySelector(".fl-label").value.trim(), imgUrl });
  });
  return { floors, start };
}

// markers.js — Маркеры: подписка, рендер, добавление, extra fields

import { db, ref, push, onValue }         from "./config.js";
import { QUICK_EMOJI, TYPE_EMOJI, TYPE_LABEL, TRADERS } from "./constants.js";
import { state }                          from "./state.js";
import { mapEl, mapWrapper, filterSel, searchInput,
         traderFilter, addTrader, editTrader,
         addNoBg, addSize, parseMarkerSize,
         addForm, addName, addType,
         addImgUrl, addIconUrl,
         addEmojiInput, addEmojiPicker,
         addExtraFields, addConfirm,
         addCancel, addModeBtn, toast,
         addMarkerLinks, addVideos,
         addHouseBox, addHouseName, addFloors, addIsHouse,
         addTypes, markerType,
         addPvImg, addPvText, addPvSize, addPvTextSize,
         esc, isMobile, normalizeImageUrl } from "./ui.js";
import { openModal }                      from "./modal.js";
import { attachHover, hideHover }         from "./hover.js";
import { addMarkerLinkRow, collectMarkerLinks,
         invalidateCatalog }              from "./links.js";
import { addVideoRow, collectVideos }    from "./videos.js";
import { addFloorRow, collectFloors,
         saveHouse }                      from "./houses.js";
import { readCache, writeCache,
         requireOnline }                  from "./offline.js";

const ICON_FALLBACK = "data:image/svg+xml," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E" +
  "%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

/* ── Отличаем клик от перетаскивания карты ── */
let downPos = null;
/* Точку касания запоминаем на уровне ВСЕГО документа (фаза перехвата): Panzoom останавливает событие на карте,
   и раньше точка «залипала» старой, если палец когда-то коснулся пустой области вне карты — метки переставали нажиматься. */
document.addEventListener("pointerdown", e => { downPos = { x: e.clientX, y: e.clientY }; }, true);
document.addEventListener("pointercancel", () => { downPos = null; }, true);
document.addEventListener("click", () => { setTimeout(() => { downPos = null; }, 0); }, true);   // после нажатия сбрасываем
function wasDrag(e) {
  return downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6;
}

/* ── Firebase подписка ── */
export function subscribe() {
  if (state.offFn) { state.offFn(); state.offFn = null; }
  state.dataLoaded = false;
  state.currentRef = ref(db, `maps/${state.currentMap}/markers`);

  /* Сохранённые метки показываем сразу (быстрый старт и работа без интернета) */
  const cached = readCache(state.currentMap);
  if (cached) {
    state.allMarkers = cached;
    render();
    const pend = state.pending;
    if (pend && (cached[pend.id] || (pend.houseId && Object.values(cached).some(x => x.houseId === pend.houseId)))) {
      state.dataLoaded = true;
      if (state.onData) state.onData();
    }
  }

  state.offFn = onValue(state.currentRef, snap => {
    state.allMarkers = {};
    snap.forEach(i => { state.allMarkers[i.key] = i.val(); });
    writeCache(state.currentMap, state.allMarkers);
    state.dataLoaded = true;
    render();
    if (state.onData) state.onData();
  }, err => {
    console.error(err);
    toast(err.code === "PERMISSION_DENIED"
      ? "Нет доступа к меткам (проверьте правила Firebase)"
      : "Не удалось загрузить метки", true);
  });
}

/* ── Рендер — только маркеры текущего уровня, с учётом фильтра и поиска ── */
export function render() {
  hideHover();
  document.querySelectorAll(".marker").forEach(m => m.remove());
  const f = filterSel.value;
  const tr = traderFilter.value;
  const q = (searchInput?.value || "").trim().toLowerCase();
  const frag = document.createDocumentFragment();

  Object.entries(state.allMarkers).forEach(([id, m]) => {
    if (f !== "all" && markerType(m) !== f && !(Array.isArray(m.types) && m.types.includes(f))) return;
    if (tr !== "all" && m.trader !== tr) return;
    if ((m.level ?? 0) !== state.currentLevel) return;
    if (q) {
      const hay = ((m.name || "") + " " + (TRADERS[m.trader]?.label || "")).toLowerCase();
      if (!hay.includes(q)) return;
    }
    frag.appendChild(createMarker(id, m));
  });
  mapEl.appendChild(frag);
}

filterSel.value = localStorage.getItem("markerFilter") || "all";
if (filterSel.value === "") filterSel.value = "all";
filterSel.addEventListener("change", () => {
  localStorage.setItem("markerFilter", filterSel.value);
  render();
});

/* ── Списки торговцев: фильтр + формы (необязательное поле) ── */
export function fillTraderSelect(sel, firstValue, firstLabel) {
  sel.innerHTML = "";
  sel.add(new Option(firstLabel, firstValue));
  Object.entries(TRADERS).forEach(([key, t]) => sel.add(new Option(t.label, key)));
}
fillTraderSelect(traderFilter, "all", "Все торговцы");
fillTraderSelect(addTrader,    "",    "— не указан —");
fillTraderSelect(editTrader,   "",    "— не указан —");

traderFilter.value = localStorage.getItem("traderFilter") || "all";
if (traderFilter.value === "") traderFilter.value = "all";
traderFilter.addEventListener("change", () => {
  localStorage.setItem("traderFilter", traderFilter.value);
  render();
});

/* ── Дополнительные типы (чипы): метка попадает в фильтр по основному и по любому из них ── */
export function buildTypeChips(container) {
  container.innerHTML = "";
  Object.entries(TYPE_LABEL).forEach(([key, label]) => {
    const l = document.createElement("label");
    l.className = "chip";
    l.dataset.type = key;
    l.innerHTML = `<input type="checkbox" value="${esc(key)}"><span>${esc(TYPE_EMOJI[key] || "")} ${esc(label)}</span>`;
    container.appendChild(l);
  });
}
export function setTypeChips(container, primary, extra = []) {
  container.querySelectorAll(".chip").forEach(l => {
    const isPrimary = l.dataset.type === primary;
    l.style.display = isPrimary ? "none" : "";
    l.querySelector("input").checked = !isPrimary && extra.includes(l.dataset.type);
  });
}
export function collectTypeChips(container, primary) {
  return [...container.querySelectorAll(".chip input:checked")].map(i => i.value).filter(v => v !== primary);
}
export function syncTypeChips(typeSel, container) {
  setTypeChips(container, typeSel.value, collectTypeChips(container, null));
}
buildTypeChips(addTypes);
addType.addEventListener("change", () => syncTypeChips(addType, addTypes));

/* Блок «Вход в дом» раскрывается галочкой (дом — отдельная функция метки, а не тип) */
export function syncHouseBox(checkbox, box, container) {
  const on = checkbox.checked;
  box.style.display = on ? "" : "none";
  if (on && !container.querySelector(".fl-row")) addFloorRow(container, { label: "1 этаж", imgUrl: "" }, true);
}
addIsHouse.addEventListener("change", () => syncHouseBox(addIsHouse, addHouseBox, addFloors));
document.getElementById("addFloorBtn").addEventListener("click", () => addFloorRow(addFloors));

let searchTimer = null;
searchInput?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 150);
});

/* ── Создание DOM-маркера ── */
export function createMarker(id, m) {
  const div = document.createElement("div");
  div.className  = "marker";
  div.dataset.id = id;
  div.dataset.name = m.name || "";
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";
  if (isMobile()) div.classList.add("no-hover");
  if (state.current?.id === id || state.highlightId === id) div.classList.add("selected");
  if (m.noBg) div.classList.add("no-bg");
  const size = parseMarkerSize(m.size);
  if (size) div.style.setProperty("--ms", String(size / 100));

  const mtype = markerType(m);
  const typeClass = TYPE_EMOJI[mtype] ? mtype : "custom";
  let iconHTML;
  if (m.iconUrl) {
    iconHTML = `<div class="marker-icon icon-img"><img src="${esc(normalizeImageUrl(m.iconUrl))}" alt="" draggable="false"></div>`;
  } else {
    const displayEmoji = m.emoji || (m.houseId ? "🏠" : TYPE_EMOJI[mtype]) || "📍";
    iconHTML = `<div class="marker-icon ${typeClass}"><span>${esc(displayEmoji)}</span></div>`;
  }

  div.innerHTML = iconHTML;
  attachHover(div, m);          // подсказка при наведении (ПК): размер не зависит от масштаба карты

  const iconImg = div.querySelector(".icon-img img");
  if (iconImg) iconImg.addEventListener("error", () => { iconImg.src = ICON_FALLBACK; }, { once: true });
  div.addEventListener("contextmenu", e => { if (e.target.tagName === "IMG") e.preventDefault(); });

  div.addEventListener("click", e => {
    e.stopPropagation();
    if (state.addMode || wasDrag(e)) return;
    const cur = state.allMarkers[id] || m;
    /* Игрок: значок дома сразу открывает план дома. Админ: окно метки (там же кнопка «Войти в дом») */
    if (cur.houseId && !state.isAdmin && state.enterHouse) {
      state.enterHouse(cur.houseId, id);
      return;
    }
    openModal(id, cur);
  });
  return div;
}

/* ── Режим добавления (только админ) ── */
export function enterAddMode() {
  if (!state.isAdmin || !requireOnline()) return;
  state.addMode = true;
  addModeBtn.textContent = "✕ Отмена";
  addModeBtn.classList.add("btn-danger");
  mapWrapper.style.cursor = "crosshair";
  toast(`Нажмите на карту для добавления маркера (уровень: ${state.currentLevel})`);
}

export function exitAddMode() {
  state.addMode    = false;
  state.pendingPos = null;
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  addForm.style.display  = "none";
  mapWrapper.style.cursor = "";
}

addModeBtn.onclick = () => state.addMode ? exitAddMode() : enterAddMode();

mapEl.addEventListener("click", e => {
  if (!state.addMode || !state.isAdmin) return;
  if (e.target.closest(".marker") || wasDrag(e)) return;
  const r = mapEl.getBoundingClientRect();
  state.pendingPos = {
    x: ((e.clientX - r.left) / r.width)  * 100,
    y: ((e.clientY - r.top)  / r.height) * 100
  };
  addForm.style.display = "flex";
  addName.value = addImgUrl.value = addIconUrl.value = addEmojiInput.value = "";
  addType.value = "loot";
  addTrader.value = "";
  addNoBg.checked = false;
  addSize.value = "";
  addFloors.innerHTML = "";
  addHouseName.value = "";
  addIsHouse.checked = false;
  syncHouseBox(addIsHouse, addHouseBox, addFloors);
  setTypeChips(addTypes, addType.value, []);
  addPvImg.checked = true;
  addPvText.checked = true;
  addPvSize.value = "";
  addPvTextSize.value = "";
  if (state.addQuill) state.addQuill.setContents([]);
  addEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
  addExtraFields.innerHTML = "";
  addMarkerLinks.innerHTML = "";
  addVideos.innerHTML = "";
  invalidateCatalog();
});

addConfirm.onclick = async () => {
  if (!state.isAdmin || !state.pendingPos || !requireOnline()) return;
  const name = addName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textVal = (state.addQuill && state.addQuill.getText().trim())
    ? state.addQuill.root.innerHTML : null;
  const extraFields = collectExtraFields(addExtraFields);
  const markerLinks = collectMarkerLinks(addMarkerLinks);
  const videos = collectVideos(addVideos);
  if (videos.invalid) { toast("Не удалось распознать ссылку на видео", true); return; }
  let houseId = null;
  if (addIsHouse.checked) {
    const fl = collectFloors(addFloors);
    if (!fl.floors.length) { toast("Добавьте хотя бы один этаж с картинкой", true); return; }
    try {
      houseId = await saveHouse({ name: addHouseName.value.trim() || name, map: state.currentMap, ...fl });
    } catch (e) { toast(e.message, true); return; }
  }
  const pr = push(state.currentRef, {
    x: state.pendingPos.x, y: state.pendingPos.y,
    level:       state.currentLevel,
    name,
    text:        textVal,
    type:        addType.value,
    types:       collectTypeChips(addTypes, addType.value).length ? collectTypeChips(addTypes, addType.value) : null,
    noPvImg:     addPvImg.checked ? null : true,
    noPvText:    addPvText.checked ? null : true,
    pvSize:      parseMarkerSize(addPvSize.value),
    pvTextSize:  parseMarkerSize(addPvTextSize.value),
    trader:      addTrader.value || null,
    houseId:     houseId || null,
    noBg:        addNoBg.checked ? true : null,
    size:        parseMarkerSize(addSize.value),
    emoji:       addEmojiInput.value.trim()  || null,
    imgUrl:      addImgUrl.value.trim()      || null,
    iconUrl:     addIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
    markerLinks: markerLinks.length ? markerLinks : null,
    videos:      videos.length ? videos : null,
  });
  pr.then(() => {
    toast("Маркер добавлен");
    invalidateCatalog();
    exitAddMode();
    /* Новый дом: сразу заходим внутрь, чтобы добавить метки на этажах */
    if (houseId && state.enterHouse) {
      toast("Дом создан — выберите этаж и добавляйте метки");
      state.enterHouse(houseId, pr.key);
    }
  }).catch(e => toast(e.message, true));
};

addCancel.onclick = exitAddMode;

document.getElementById("addExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(addExtraFields);
});

document.getElementById("addVideoBtn").addEventListener("click", () => addVideoRow(addVideos));

document.getElementById("addMarkerLinkBtn").addEventListener("click", () => {
  addMarkerLinkRow(addMarkerLinks);
});

/* ── Emoji picker ── */
export function buildEmojiPicker(pickerEl, inputEl) {
  pickerEl.innerHTML = "";
  QUICK_EMOJI.forEach(em => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.textContent = em;
    btn.onclick = () => {
      inputEl.value = em;
      pickerEl.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
    pickerEl.appendChild(btn);
  });
}

/* ── Extra fields ── */
export function addExtraFieldRow(container, label = "", value = "") {
  const row = document.createElement("div");
  row.className = "extra-field-row";
  row.innerHTML = `
    <input type="text" class="extra-field-label" placeholder="Название поля" value="${esc(label)}">
    <input type="text" class="extra-field-value" placeholder="Значение" value="${esc(value)}">
    <button type="button" class="extra-field-remove btn btn-sm btn-danger">✕</button>`;
  row.querySelector(".extra-field-remove").onclick = () => row.remove();
  container.appendChild(row);
}

export function collectExtraFields(container) {
  const result = [];
  container.querySelectorAll(".extra-field-row").forEach(row => {
    const label = row.querySelector(".extra-field-label").value.trim();
    const value = row.querySelector(".extra-field-value").value.trim();
    if (label || value) result.push({ label, value });
  });
  return result;
}

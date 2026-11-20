// markers.js — Маркеры: подписка, рендер, добавление, extra fields

import { db, ref, push, onValue }         from "./config.js";
import { QUICK_EMOJI, TYPE_EMOJI }        from "./constants.js";
import { state }                          from "./state.js";
import { mapEl, mapWrapper, filterSel, searchInput,
         addForm, addName, addType,
         addImgUrl, addIconUrl,
         addEmojiInput, addEmojiPicker,
         addExtraFields, addConfirm,
         addCancel, addModeBtn, toast,
         esc, isMobile }                  from "./ui.js";
import { openModal }                      from "./modal.js";

const ICON_FALLBACK = "data:image/svg+xml," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E" +
  "%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

/* ── Отличаем клик от перетаскивания карты ── */
let downPos = null;
mapWrapper.addEventListener("pointerdown", e => { downPos = { x: e.clientX, y: e.clientY }; });
function wasDrag(e) {
  return downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6;
}

/* ── Firebase подписка ── */
export function subscribe() {
  if (state.offFn) { state.offFn(); state.offFn = null; }
  state.dataLoaded = false;
  state.currentRef = ref(db, `maps/${state.currentMap}/markers`);

  state.offFn = onValue(state.currentRef, snap => {
    state.allMarkers = {};
    snap.forEach(i => { state.allMarkers[i.key] = i.val(); });
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
  document.querySelectorAll(".marker").forEach(m => m.remove());
  const f = filterSel.value;
  const q = (searchInput?.value || "").trim().toLowerCase();
  const frag = document.createDocumentFragment();

  Object.entries(state.allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;
    if ((m.level ?? 0) !== state.currentLevel) return;
    if (q && !(m.name || "").toLowerCase().includes(q)) return;
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
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";
  if (isMobile()) div.classList.add("no-hover");
  if (state.current?.id === id) div.classList.add("selected");

  const typeClass = TYPE_EMOJI[m.type] ? m.type : "custom";
  let iconHTML;
  if (m.iconUrl) {
    iconHTML = `<div class="marker-icon icon-img"><img src="${esc(m.iconUrl)}" alt="" draggable="false"></div>`;
  } else {
    const displayEmoji = m.emoji || TYPE_EMOJI[m.type] || "📍";
    iconHTML = `<div class="marker-icon ${typeClass}"><span>${esc(displayEmoji)}</span></div>`;
  }

  const previewHTML = (!isMobile() && m.imgUrl)
    ? `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt="" draggable="false" loading="lazy"></div>`
    : "";

  div.innerHTML = `${iconHTML}${previewHTML}<div class="marker-tooltip">${esc(m.name || "")}</div>`;

  const iconImg = div.querySelector(".icon-img img");
  if (iconImg) iconImg.addEventListener("error", () => { iconImg.src = ICON_FALLBACK; }, { once: true });
  div.addEventListener("contextmenu", e => { if (e.target.tagName === "IMG") e.preventDefault(); });

  div.addEventListener("click", e => {
    e.stopPropagation();
    if (state.addMode || wasDrag(e)) return;
    openModal(id, state.allMarkers[id] || m);
  });
  return div;
}

/* ── Режим добавления (только админ) ── */
export function enterAddMode() {
  if (!state.isAdmin) return;
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
  if (state.addQuill) state.addQuill.setContents([]);
  addEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
  addExtraFields.innerHTML = "";
});

addConfirm.onclick = () => {
  if (!state.isAdmin || !state.pendingPos) return;
  const name = addName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textVal = (state.addQuill && state.addQuill.getText().trim())
    ? state.addQuill.root.innerHTML : null;
  const extraFields = collectExtraFields(addExtraFields);
  push(state.currentRef, {
    x: state.pendingPos.x, y: state.pendingPos.y,
    level:       state.currentLevel,
    name,
    text:        textVal,
    type:        addType.value,
    emoji:       addEmojiInput.value.trim()  || null,
    imgUrl:      addImgUrl.value.trim()      || null,
    iconUrl:     addIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Маркер добавлен"); exitAddMode(); })
    .catch(e => toast(e.message, true));
};

addCancel.onclick = exitAddMode;

document.getElementById("addExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(addExtraFields);
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

// modal.js — Модальное окно: просмотр, редактирование, удаление маркера

import { db, ref, update, remove }        from "./config.js";
import { TYPE_LABEL, MAPS, TRADERS }       from "./constants.js";
import { state }                           from "./state.js";
import { modal, modalTitle, modalBadge,
         modalPhoto, modalDesc, modalExtras,
         editForm, editName, editType,
         editImgUrl, editIconUrl,
         editEmojiInput, editEmojiPicker,
         editExtraFields, saveBtn,
         cancelEdit, editBtn, delBtn,
         modalClose, toast, esc,
         modalLinks, editMarkerLinks,
         modalTrader, editTrader,
         editNoBg, editSize, parseMarkerSize,
         markerType, editTypes, editIsHouse,
         editPvImg, editPvText, editPvSize, editPvTextSize,
         modalVideos, editVideos,
         modalHouse, editHouseBox, editHouseName, editFloors,
         buildHash, sanitizeHTML, mapEl,
         normalizeImageUrl }              from "./ui.js";
import { addExtraFieldRow,
         collectExtraFields,
         syncHouseBox, buildTypeChips,
         setTypeChips, collectTypeChips,
         syncTypeChips }                   from "./markers.js";
import { HOUSES, addFloorRow, collectFloors,
         fillFloors, saveHouse,
         deleteHouse }                    from "./houses.js";
import { addMarkerLinkRow, collectMarkerLinks,
         invalidateCatalog }              from "./links.js";
import { requireOnline }                  from "./offline.js";
import { addVideoRow, collectVideos,
         renderVideos, stopVideos }       from "./videos.js";

/* ── Показ/скрытие формы редактирования ── */
function showEditForm() {
  editForm.classList.add("active");
  saveBtn.style.display    = "";
  cancelEdit.style.display = "";
  editBtn.style.display    = "none";
  setTimeout(() => { if (state.editQuill) state.editQuill.update(); }, 60);
}

function hideEditForm() {
  editForm.classList.remove("active");
  saveBtn.style.display    = "none";
  cancelEdit.style.display = "none";
  editBtn.style.display    = state.isAdmin ? "" : "none";
  delBtn.style.display     = state.isAdmin ? "" : "none";
}

/* Вызывается при входе/выходе — обновляет кнопки в открытом окне */
export function refreshModalControls() {
  if (!state.isAdmin) hideEditForm();
  else if (!editForm.classList.contains("active")) hideEditForm();
}

function markSelected(id) {
  mapEl.querySelectorAll(".marker.selected").forEach(el => el.classList.remove("selected"));
  if (id) mapEl.querySelector(`.marker[data-id="${CSS.escape(id)}"]`)?.classList.add("selected");
}

/* ── Открытие модалки ── */
export function openModal(id, m) {
  history.replaceState(null, "", buildHash({
    map: state.currentMap, level: m.level ?? 0, marker: id
  }));
  state.current = { id, ...m };

  modalTitle.textContent = m.name || "Маркер";
  const mt = markerType(m);
  modalBadge.textContent = TYPE_LABEL[mt] || mt;
  modalBadge.className   = `modal-type-badge badge-${TYPE_LABEL[mt] ? mt : "loot"}`;
  /* дополнительные типы — рядом маленькими бейджами */
  modalBadge.parentElement.querySelectorAll(".extra-badge").forEach(b => b.remove());
  let anchor = modalBadge;
  (Array.isArray(m.types) ? m.types : []).filter(t => TYPE_LABEL[t] && t !== mt).forEach(t => {
    const b = document.createElement("span");
    b.className = `modal-type-badge extra-badge badge-${t}`;
    b.textContent = TYPE_LABEL[t];
    anchor.after(b);
    anchor = b;
  });

  const tr = TRADERS[m.trader];
  modalTrader.textContent   = tr ? "🛒 " + tr.label : "";
  modalTrader.style.display = tr ? "" : "none";

  if (m.text) {
    modalDesc.innerHTML     = sanitizeHTML(m.text);
    modalDesc.style.display = "";
  } else {
    modalDesc.innerHTML     = "";
    modalDesc.style.display = "none";
  }

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = normalizeImageUrl(m.imgUrl);

  renderModalLinks(m.markerLinks);
  renderVideos(modalVideos, m.videos);
  renderHouseButton(m, id);
  renderModalExtras(m.extraFields);
  hideEditForm();
  modal.classList.add("open");
  document.body.classList.add("modal-open");
  markSelected(id);
}

/* Кнопка «Войти в дом» (в окне метки; игроки попадают в дом сразу по нажатию на значок) */
function renderHouseButton(m, id) {
  modalHouse.innerHTML = "";
  const h = m.houseId ? HOUSES[m.houseId] : null;
  modalHouse.style.display = h ? "" : "none";
  if (!h) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "house-enter";
  b.textContent = `🏠 Войти в дом · этажей: ${h.floors.length}`;
  b.onclick = () => { closeModal(); if (state.enterHouse) state.enterHouse(m.houseId, id); };
  modalHouse.appendChild(b);
}

/* ── Закрытие модалки ── */
export function closeModal() {
  history.replaceState(null, "", location.pathname + location.search);
  modal.classList.remove("open");
  stopVideos(modalVideos);
  document.body.classList.remove("modal-open");
  state.current = null;
  markSelected(null);
  hideEditForm();
}

/* ── Маркеры-ссылки в модалке: текст + кнопка с названием маркера ── */
function renderModalLinks(links) {
  modalLinks.innerHTML = "";
  const valid = (links || []).filter(l => l && l.id && MAPS[l.map]);
  modalLinks.style.display = valid.length ? "" : "none";
  valid.forEach(l => {
    const live = l.map === state.currentMap ? state.allMarkers[l.id] : null;
    const row  = document.createElement("div");
    row.className = "modal-link-row";

    if (l.text) {
      const t = document.createElement("span");
      t.className   = "modal-link-text";
      t.textContent = l.text;
      row.appendChild(t);
    }

    const b = document.createElement("button");
    b.type = "button";
    b.className = "marker-link";
    const nm = document.createElement("span");
    nm.textContent = "📍 " + (live?.name || l.name || "Метка");
    b.appendChild(nm);
    if (l.map !== state.currentMap) {
      const mp = document.createElement("small");
      mp.className   = "marker-link-map";
      mp.textContent = MAPS[l.map].label;
      b.appendChild(mp);
    }
    b.onclick = () => state.goToMarker && state.goToMarker(l);
    row.appendChild(b);
    modalLinks.appendChild(row);
  });
}

/* ── Extra fields в модалке ── */
function renderModalExtras(extraFields) {
  modalExtras.innerHTML = "";
  if (!extraFields || !extraFields.length) return;
  extraFields.forEach(f => {
    if (!f.label && !f.value) return;
    const row = document.createElement("div");
    row.className = "modal-extra-row";
    row.innerHTML = `<span class="modal-extra-label">${esc(f.label)}</span>
                    <span class="modal-extra-value">${esc(f.value)}</span>`;
    modalExtras.appendChild(row);
  });
}

/* ── Кнопки модалки ── */
modalClose.onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
});

/* Копирование ссылки: полная ссылка с картой, этажом и маркером */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy") ? resolve() : reject(); }
    catch (e) { reject(e); }
    finally { ta.remove(); }
  });
}

document.getElementById("copyLinkBtn").onclick = () => {
  if (!state.current) return;
  const hash = buildHash({
    map: state.currentMap, level: state.current.level ?? 0, marker: state.current.id
  });
  copyText(`${location.origin}${location.pathname}${hash}`)
    .then(() => toast("Ссылка скопирована"))
    .catch(() => toast("Не удалось скопировать", true));
};

/* ── Редактирование (только админ) ── */
editBtn.onclick = () => {
  if (!state.current || !state.isAdmin || !requireOnline()) return;
  editName.value       = state.current.name    || "";
  editType.value       = markerType(state.current);
  editTrader.value     = state.current.trader  || "";
  editNoBg.checked     = !!state.current.noBg;
  editSize.value       = state.current.size || "";
  editImgUrl.value     = state.current.imgUrl  || "";
  editIconUrl.value    = state.current.iconUrl || "";
  editEmojiInput.value = state.current.emoji   || "";
  if (state.editQuill) {
    if (state.current.text) state.editQuill.root.innerHTML = state.current.text;
    else state.editQuill.setContents([]);
  }
  editEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === state.current.emoji);
  });
  editExtraFields.innerHTML = "";
  (state.current.extraFields || []).forEach(f => addExtraFieldRow(editExtraFields, f.label, f.value));
  editMarkerLinks.innerHTML = "";
  invalidateCatalog();
  (state.current.markerLinks || []).forEach(l => addMarkerLinkRow(editMarkerLinks, l, state.current.id));
  editVideos.innerHTML = "";
  (state.current.videos || []).forEach(v => addVideoRow(editVideos, v));
  const house = state.current.houseId ? HOUSES[state.current.houseId] : null;
  editHouseName.value = house?.name || "";
  fillFloors(editFloors, house);
  editIsHouse.checked = !!state.current.houseId;
  syncHouseBox(editIsHouse, editHouseBox, editFloors);
  setTypeChips(editTypes, editType.value, state.current.types || []);
  editPvImg.checked     = !state.current.noPvImg;
  editPvText.checked    = !state.current.noPvText;
  editPvSize.value      = state.current.pvSize || "";
  editPvTextSize.value  = state.current.pvTextSize || "";
  showEditForm();
};

cancelEdit.onclick = hideEditForm;

saveBtn.onclick = async () => {
  if (!state.current || !state.isAdmin || !requireOnline()) return;
  const name = editName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textVal = (state.editQuill && state.editQuill.getText().trim())
    ? state.editQuill.root.innerHTML : null;
  const extraFields = collectExtraFields(editExtraFields);
  const markerLinks = collectMarkerLinks(editMarkerLinks);
  const videos = collectVideos(editVideos);
  if (videos.invalid) { toast("Не удалось распознать ссылку на видео", true); return; }
  let houseId = state.current.houseId || null;
  if (!editIsHouse.checked && houseId) {
    if (!confirm("Убрать вход в дом? Сам дом со всеми этажами и метками внутри будет удалён.")) return;
    try { await deleteHouse(houseId); } catch (e) { toast(e.message, true); return; }
    houseId = null;
  }
  if (editIsHouse.checked) {
    const fl = collectFloors(editFloors);
    if (!fl.floors.length) { toast("Добавьте хотя бы один этаж с картинкой", true); return; }
    try {
      houseId = await saveHouse({ houseId, name: editHouseName.value.trim() || name, map: state.currentMap, ...fl });
    } catch (e) { toast(e.message, true); return; }
  }
  /* x, y и level не трогаем — обновляем только редактируемые поля */
  update(ref(db, `maps/${state.currentMap}/markers/${state.current.id}`), {
    name,
    text:        textVal,
    type:        editType.value,
    trader:      editTrader.value || null,
    houseId:     editIsHouse.checked ? houseId : null,
    types:       collectTypeChips(editTypes, editType.value).length ? collectTypeChips(editTypes, editType.value) : null,
    noPvImg:     editPvImg.checked ? null : true,
    noPvText:    editPvText.checked ? null : true,
    pvSize:      parseMarkerSize(editPvSize.value),
    pvTextSize:  parseMarkerSize(editPvTextSize.value),
    noBg:        editNoBg.checked ? true : null,
    size:        parseMarkerSize(editSize.value),
    emoji:       editEmojiInput.value.trim()  || null,
    imgUrl:      editImgUrl.value.trim()      || null,
    iconUrl:     editIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
    markerLinks: markerLinks.length ? markerLinks : null,
    videos:      videos.length ? videos : null,
  }).then(() => { toast("Сохранено"); invalidateCatalog(); closeModal(); })
    .catch(e => toast(e.message, true));
};

document.getElementById("editExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(editExtraFields);
});

buildTypeChips(editTypes);
editType.addEventListener("change", () => syncTypeChips(editType, editTypes));
editIsHouse.addEventListener("change", () => syncHouseBox(editIsHouse, editHouseBox, editFloors));
document.getElementById("editFloorBtn").addEventListener("click", () => addFloorRow(editFloors));

document.getElementById("editVideoBtn").addEventListener("click", () => addVideoRow(editVideos));

document.getElementById("editMarkerLinkBtn").addEventListener("click", () => {
  addMarkerLinkRow(editMarkerLinks, null, state.current?.id);
});

/* ── Удаление (только админ) ── */
delBtn.onclick = async () => {
  if (!state.current || !state.isAdmin || !requireOnline()) return;
  const hid = state.current.houseId || null;
  if (!confirm(hid ? "Удалить маркер и сам дом (все этажи и метки внутри)?" : "Удалить маркер?")) return;
  try {
    await remove(ref(db, `maps/${state.currentMap}/markers/${state.current.id}`));
    if (hid) await deleteHouse(hid);
    toast("Удалено");
    invalidateCatalog();
    closeModal();
  } catch (e) { toast(e.message, true); }
};

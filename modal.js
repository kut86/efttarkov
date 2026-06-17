// modal.js — Модальное окно: просмотр, редактирование, удаление маркера

import { db, ref, update, remove }        from "./config.js";
import { TYPE_LABEL, LEVELS }             from "./constants.js";
import { state }                          from "./state.js";
import { canEdit, getLevelInfo }          from "./access-control.js";
import { modal, modalTitle, modalBadge,
         modalPhoto, modalDesc, modalExtras,
         editForm, editName, editType,
         editImgUrl, editIconUrl,
         editEmojiInput, editEmojiPicker,
         editExtraFields, saveBtn,
         cancelEdit, editBtn, delBtn,
         modalClose, toast, esc }         from "./ui.js";
import { addExtraFieldRow,
         collectExtraFields,
         buildEmojiPicker }              from "./markers.js";

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
  editBtn.style.display    = canEdit() ? "" : "none";
  delBtn.style.display     = canEdit() ? "" : "none";
}

/* ── Открытие модалки ── */
export function openModal(id, m) {
  history.replaceState(null, "", `#marker=${id}`);
  state.current = { id, ...m };

  modalTitle.textContent = m.name || "Маркер";
  modalBadge.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;

  /* Описание */
  if (m.text) {
    modalDesc.innerHTML     = m.text;
    modalDesc.style.display = "";
  } else {
    modalDesc.innerHTML     = "";
    modalDesc.style.display = "none";
  }

  /* Фото */
  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  /* Бейдж уровня доступа */
  renderAccessBadge(m.minAccess ?? 0);

  /* Доп. поля */
  renderModalExtras(m.extraFields);

  hideEditForm();
  modal.classList.add("open");
}

/* ── Закрытие модалки ── */
export function closeModal() {
  history.replaceState(null, "", location.pathname);
  modal.classList.remove("open");
  state.current = null;
  hideEditForm();
}

/* ── Бейдж уровня доступа в модалке ── */
function renderAccessBadge(minAccess) {
  /* Убираем старый */
  const old = document.getElementById("modalAccessBadge");
  if (old) old.remove();

  if (!minAccess || minAccess === 0) return;

  const info  = getLevelInfo(minAccess);
  const badge = document.createElement("div");
  badge.id        = "modalAccessBadge";
  badge.className = "modal-access-badge";
  badge.innerHTML = `${info.icon} Только для <strong>${info.name}</strong> и выше`;

  /* Вставляем перед описанием */
  modalDesc.parentNode.insertBefore(badge, modalDesc);
}

/* ── Extra fields в модалке ── */
function renderModalExtras(extraFields) {
  modalExtras.innerHTML = "";
  if (!extraFields?.length) return;
  extraFields.forEach(f => {
    if (!f.label && !f.value) return;
    const row = document.createElement("div");
    row.className = "modal-extra-row";
    row.innerHTML = `
      <span class="modal-extra-label">${esc(f.label)}</span>
      <span class="modal-extra-value">${esc(f.value)}</span>`;
    modalExtras.appendChild(row);
  });
}

/* ── Кнопки модалки ── */
modalClose.onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

document.getElementById("copyLinkBtn").onclick = () => {
  const url = `${location.origin}${location.pathname}#marker=${state.current?.id}`;
  navigator.clipboard.writeText(url)
    .then(()  => toast("Ссылка скопирована"))
    .catch(()  => toast("Не удалось скопировать", true));
};

/* ── Редактирование ── */
editBtn.onclick = () => {
  if (!state.current) return;

  editName.value       = state.current.name    || "";
  editType.value       = state.current.type    || "loot";
  editImgUrl.value     = state.current.imgUrl  || "";
  editIconUrl.value    = state.current.iconUrl || "";
  editEmojiInput.value = state.current.emoji   || "";

  /* Quill */
  if (state.editQuill) {
    state.current.text
      ? (state.editQuill.root.innerHTML = state.current.text)
      : state.editQuill.setContents([]);
  }

  /* Emoji picker */
  editEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === state.current.emoji);
  });

  /* Extra fields */
  editExtraFields.innerHTML = "";
  (state.current.extraFields || []).forEach(f =>
    addExtraFieldRow(editExtraFields, f.label, f.value)
  );

  /* minAccess селект */
  const minAccessSel = document.getElementById("editMinAccess");
  if (minAccessSel) minAccessSel.value = String(state.current.minAccess ?? 0);

  showEditForm();
};

cancelEdit.onclick = hideEditForm;

/* ── Сохранение ── */
saveBtn.onclick = () => {
  if (!state.current) return;

  const name = editName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }

  const textHTML = state.editQuill ? state.editQuill.root.innerHTML : null;
  const textVal  = (state.editQuill && state.editQuill.getText().trim()) ? textHTML : null;
  const extraFields = collectExtraFields(editExtraFields);

  const minAccessSel = document.getElementById("editMinAccess");
  const minAccess    = minAccessSel ? Number(minAccessSel.value) : 0;

  update(ref(db, `maps/${state.currentMap}/markers/${state.current.id}`), {
    x:           state.current.x,
    y:           state.current.y,
    level:       state.current.level ?? 0,
    name,
    text:        textVal,
    type:        editType.value,
    emoji:       editEmojiInput.value.trim()  || null,
    imgUrl:      editImgUrl.value.trim()      || null,
    iconUrl:     editIconUrl.value.trim()     || null,
    minAccess:   minAccess || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Сохранено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

document.getElementById("editExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(editExtraFields);
});

/* ── Удаление ── */
delBtn.onclick = () => {
  if (!state.current) return;
  if (!confirm("Удалить маркер?")) return;
  remove(ref(db, `maps/${state.currentMap}/markers/${state.current.id}`))
    .then(() => { toast("Удалено"); closeModal(); })
    .catch(e => toast(e.message, true));
};
         

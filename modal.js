// modal.js — Модальное окно: просмотр, редактирование, удаление маркера

import { db, ref, update, remove }        from "./config.js";
import { TYPE_LABEL }                      from "./constants.js";
import { state }                           from "./state.js";
import { modal, modalTitle, modalBadge,
         modalPhoto, modalDesc, modalExtras,
         editForm, editName, editType,
         editImgUrl, editIconUrl,
         editEmojiInput, editEmojiPicker,
         editExtraFields, saveBtn,
         cancelEdit, editBtn, delBtn,
         modalClose, toast, esc }           from "./ui.js";
import { addExtraFieldRow,
         collectExtraFields,
         buildEmojiPicker }                from "./markers.js";

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

/* ── Открытие модалки ── */
export function openModal(id, m) {
  history.replaceState(null, "", `#marker=${id}`);
  state.current = { id, ...m };

  modalTitle.textContent = m.name || "Маркер";
  modalBadge.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;

  if (m.text) {
    modalDesc.innerHTML     = m.text;
    modalDesc.style.display = "";
  } else {
    modalDesc.innerHTML     = "";
    modalDesc.style.display = "none";
  }

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

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

document.getElementById("copyLinkBtn").onclick = () => {
  const url = `${location.origin}${location.pathname}#marker=${state.current.id}`;
  navigator.clipboard.writeText(url)
    .then(() => toast("Ссылка скопирована"))
    .catch(() => toast("Не удалось скопировать", true));
};

/* ── Редактирование ── */
editBtn.onclick = () => {
  if (!state.current) return;
  editName.value       = state.current.name    || "";
  editType.value       = state.current.type    || "loot";
  editImgUrl.value     = state.current.imgUrl  || "";
  editIconUrl.value    = state.current.iconUrl || "";
  editEmojiInput.value = state.current.emoji   || "";
  if (state.editQuill) {
    state.current.text
      ? (state.editQuill.root.innerHTML = state.current.text)
      : state.editQuill.setContents([]);
  }
  editEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === state.current.emoji);
  });
  editExtraFields.innerHTML = "";
  (state.current.extraFields || []).forEach(f => addExtraFieldRow(editExtraFields, f.label, f.value));
  showEditForm();
};

cancelEdit.onclick = hideEditForm;

saveBtn.onclick = () => {
  if (!state.current) return;
  const name = editName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textHTML = state.editQuill ? state.editQuill.root.innerHTML : null;
  const textVal  = (state.editQuill && state.editQuill.getText().trim()) ? textHTML : null;
  const extraFields = collectExtraFields(editExtraFields);
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
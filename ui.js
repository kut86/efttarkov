// ui.js — DOM-элементы и вспомогательные функции

/* ── DOM ── */
export const mapEl          = document.getElementById("map");
export const mapImg         = document.getElementById("mapImage");
export const loginBtn       = document.getElementById("loginBtn");
export const logoutBtn      = document.getElementById("logoutBtn");
export const adminBadge     = document.getElementById("adminBadge");
export const addModeBtn     = document.getElementById("addModeBtn");
export const filterSel      = document.getElementById("filter");
export const mapSelect      = document.getElementById("mapSelect");
export const mapWrapper     = document.getElementById("mapWrapper");
export const addForm        = document.getElementById("addForm");
export const addName        = document.getElementById("addName");
export const addType        = document.getElementById("addType");
export const addImgUrl      = document.getElementById("addImgUrl");
export const addIconUrl     = document.getElementById("addIconUrl");
export const addEmojiInput  = document.getElementById("addEmojiInput");
export const addEmojiPicker = document.getElementById("addEmojiPicker");
export const addExtraFields = document.getElementById("addExtraFields");
export const addConfirm     = document.getElementById("addConfirm");
export const addCancel      = document.getElementById("addCancel");
export const modal          = document.getElementById("modal");
export const modalTitle     = document.getElementById("modalTitle");
export const modalBadge     = document.getElementById("modalBadge");
export const modalPhoto     = document.getElementById("modalPhoto");
export const modalDesc      = document.getElementById("modalDesc");
export const modalCoords    = document.getElementById("modalCoords");
export const modalExtras    = document.getElementById("modalExtras");
export const editForm       = document.getElementById("editForm");
export const editName       = document.getElementById("editName");
export const editType       = document.getElementById("editType");
export const editImgUrl     = document.getElementById("editImgUrl");
export const editIconUrl    = document.getElementById("editIconUrl");
export const editEmojiInput = document.getElementById("editEmojiInput");
export const editEmojiPicker= document.getElementById("editEmojiPicker");
export const editExtraFields= document.getElementById("editExtraFields");
export const saveBtn        = document.getElementById("saveBtn");
export const cancelEdit     = document.getElementById("cancelEdit");
export const editBtn        = document.getElementById("editBtn");
export const delBtn         = document.getElementById("delBtn");
export const modalClose     = document.getElementById("modalClose");
export const levelUp        = document.getElementById("levelUp");
export const levelDown      = document.getElementById("levelDown");
export const levelLabel     = document.getElementById("levelLabel");
export const levelControls  = document.getElementById("levelControls");

/* ── Вспомогательные функции ── */

export function isMobile() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g, "&quot;");
}

export function toast(msg, err = false) {
  const tc = document.getElementById("toastContainer");
  const t  = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
// main.js — Точка входа: карта открывается сразу, вход необязателен

import { MAPS }                            from "./constants.js";
import { state }                           from "./state.js";
import { toast, adminBadge, addModeBtn, mapSelect,
         addEmojiPicker, addEmojiInput,
         editEmojiPicker, editEmojiInput,
         parseHash }                       from "./ui.js";
import { switchMap, resolveLegacyMarker }  from "./map.js";
import { exitAddMode, buildEmojiPicker }   from "./markers.js";
import { refreshModalControls }            from "./modal.js";
import { initAuth }                        from "./auth.js";

/* ── Emoji pickers ── */
buildEmojiPicker(addEmojiPicker, addEmojiInput);
buildEmojiPicker(editEmojiPicker, editEmojiInput);

/* ── Quill (если CDN недоступен — карта всё равно работает) ── */
if (window.Quill) {
  state.addQuill = new Quill("#addQuillEditor", {
    theme: "snow", placeholder: "Подробное описание...",
    modules: { toolbar: "#addQuillToolbar" }
  });
  state.editQuill = new Quill("#editQuillEditor", {
    theme: "snow", placeholder: "Описание...",
    modules: { toolbar: "#editQuillToolbar" }
  });
}

/* ── Права: гость по умолчанию, админ — после входа ── */
function applyAuth(user, profile) {
  state.user    = user;
  state.isAdmin = !!profile && profile.role === "admin" && !profile.banned;

  adminBadge.style.display = state.isAdmin ? "" : "none";
  addModeBtn.style.display = state.isAdmin ? "" : "none";
  if (!state.isAdmin) exitAddMode();
  refreshModalControls();

  if (profile?.banned) toast("Аккаунт заблокирован — доступен только просмотр", true);
}
initAuth(applyAuth);

/* ── Старт карты (не ждёт авторизации) ── */
async function start() {
  const h     = parseHash();
  const saved = localStorage.getItem("lastMap");
  let startMap = MAPS[h.map] ? h.map : (MAPS[saved] ? saved : "groundzero");
  let pending  = h.marker ? { id: h.marker, level: Number(h.level) || 0 } : null;

  /* Старый формат ссылки #marker=ID — выясняем, на какой он карте */
  if (h.marker && !MAPS[h.map]) {
    try {
      const found = await resolveLegacyMarker(h.marker);
      if (found) { startMap = found.map; pending = { id: h.marker, level: found.level }; }
    } catch (e) { console.warn(e); }
  }

  mapSelect.value = startMap;
  switchMap(startMap, { pending });
}
start();

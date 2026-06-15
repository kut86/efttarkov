// main.js — Точка входа: инициализация приложения

import { auth, provider, signInWithPopup,
         onAuthStateChanged, signOut }     from "./config.js";
import { MAPS, ADMIN_UID }                from "./constants.js";
import { state }                          from "./state.js";
import { toast, loginBtn, logoutBtn, adminBadge,
         addModeBtn, mapSelect,
         addEmojiPicker, addEmojiInput,
         editEmojiPicker, editEmojiInput } from "./ui.js";
import { switchMap, setLevel }            from "./map.js";
import { exitAddMode, buildEmojiPicker,
         checkUrlHash }                    from "./markers.js";
import { initAuthGuard, updateMenuProfile } from "./auth-guard.js";

/* ── Emoji pickers ── */
buildEmojiPicker(addEmojiPicker, addEmojiInput);
buildEmojiPicker(editEmojiPicker, editEmojiInput);



/* ── Auth + запуск карты ── */
loginBtn.onclick = () => signInWithPopup(auth, provider)
  .catch(e => toast(e.message, true));

logoutBtn.onclick = () => signOut(auth).then(() => location.reload());

initAuthGuard((user, profile) => {
  state.isAdmin = profile.role === "admin";

  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) profileBtn.style.display = "flex";

  loginBtn.style.display   = "none";
  logoutBtn.style.display  = "";
  adminBadge.style.display = state.isAdmin ? "" : "none";
  addModeBtn.style.display = state.isAdmin ? "" : "none";

  updateMenuProfile(profile);

  if (!state.isAdmin) exitAddMode();
         
  /* ── Quill ── */
state.addQuill = new Quill("#addQuillEditor", {
  theme: "snow",
  placeholder: "Подробное описание...",
  modules: { toolbar: "#addQuillToolbar" }
});

state.editQuill = new Quill("#editQuillEditor", {
  theme: "snow",
  placeholder: "Описание...",
  modules: { toolbar: "#editQuillToolbar" }
});
  /* ── Старт карты ── */
  const savedMap = localStorage.getItem("lastMap");
  const startMap = (savedMap && MAPS[savedMap]) ? savedMap : "groundzero";
  mapSelect.value = startMap;
  switchMap(startMap);
  checkUrlHash();

  if (state._pendingLevel !== null && state._pendingLevel !== undefined) {
    setLevel(state._pendingLevel);
    state._pendingLevel = null;
  }
});

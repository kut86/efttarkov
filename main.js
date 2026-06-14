// main.js — Точка входа: инициализация приложения

import { auth, provider, signInWithPopup,
         onAuthStateChanged, signOut }     from "./config.js";
import { toast }                          from "./ui.js";
import { MAPS, ADMIN_UID }                from "./constants.js";
import { state }                          from "./state.js";
import { loginBtn, logoutBtn, adminBadge,
         addModeBtn, mapSelect,
         addEmojiPicker, addEmojiInput,
         editEmojiPicker, editEmojiInput } from "./ui.js";
import { switchMap }                      from "./map.js";
import { exitAddMode, buildEmojiPicker,
         checkUrlHash }                    from "./markers.js";

/* ── Auth ── */
loginBtn.onclick  = () => signInWithPopup(auth, provider)
  .catch(e => toast(e.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  state.isAdmin = !!(user && user.uid === ADMIN_UID);

  loginBtn.style.display   = user          ? "none" : "";
  logoutBtn.style.display  = user          ? ""     : "none";
  adminBadge.style.display = state.isAdmin ? ""     : "none";
  addModeBtn.style.display = state.isAdmin ? ""     : "none";

  if (!state.isAdmin) exitAddMode();
});

/* ── Emoji pickers ── */
buildEmojiPicker(addEmojiPicker, addEmojiInput);
buildEmojiPicker(editEmojiPicker, editEmojiInput);

/* ── Старт ── */
const savedMap = localStorage.getItem("lastMap");
const startMap = (savedMap && MAPS[savedMap]) ? savedMap : "groundzero";
mapSelect.value = startMap;
switchMap(startMap);
checkUrlHash();

/* ── Quill (последними, после DOM) ── */
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

// main.js — Точка входа: инициализация приложения

import { auth, provider, signInWithPopup, signOut } from "./config.js";
import { MAPS }                                      from "./constants.js";
import { state }                                     from "./state.js";
import { toast, loginBtn, logoutBtn, adminBadge,
         addModeBtn, mapSelect,
         addEmojiPicker, addEmojiInput,
         editEmojiPicker, editEmojiInput }           from "./ui.js";
import { switchMap, setLevel }                       from "./map.js";
import { exitAddMode, buildEmojiPicker,
         checkUrlHash }                              from "./markers.js";
import { initAuthGuard, updateMenuProfile }          from "./auth-guard.js";

/* ──────────────────────────────────────────────
   EMOJI PICKERS
   Строим до auth — они не зависят от пользователя
   ────────────────────────────────────────────── */
buildEmojiPicker(addEmojiPicker,  addEmojiInput);
buildEmojiPicker(editEmojiPicker, editEmojiInput);

/* ──────────────────────────────────────────────
   AUTH КНОПКИ
   ────────────────────────────────────────────── */
loginBtn.onclick  = () =>
  signInWithPopup(auth, provider).catch(e => toast(e.message, true));

logoutBtn.onclick = () =>
  signOut(auth).then(() => location.reload());

/* ──────────────────────────────────────────────
   ИНИЦИАЛИЗАЦИЯ ПОСЛЕ АВТОРИЗАЦИИ
   ────────────────────────────────────────────── */
initAuthGuard((users, profile) => {
  /* ── Права ── */
  state.isAdmin = profile.role === "admin";

  /* ── UI: показываем/скрываем элементы по роли ── */
  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) profileBtn.style.display = "flex";

  loginBtn.style.display   = "none";
  logoutBtn.style.display  = "";
  adminBadge.style.display = state.isAdmin ? "" : "none";
  addModeBtn.style.display = state.isAdmin ? "" : "none";

  /* updateMenuProfile уже вызван внутри initAuthGuard,
     повторный вызов здесь нужен чтобы применить nickname/photo
     к элементам которые могли не существовать в момент первого вызова */
  updateMenuProfile(profile);

  /* Не-админу режим добавления недоступен */
  if (!state.isAdmin) exitAddMode();

  /* ── Карта ── */
  const savedMap = localStorage.getItem("lastMap");
  const startMap = (savedMap && MAPS[savedMap]) ? savedMap : "groundzero";
  mapSelect.value = startMap;
  switchMap(startMap);

  /* URL-хэш обрабатываем после switchMap */
  checkUrlHash();

  /* Отложенный переход на этаж из URL-хэша */
  if (state._pendingLevel !== null && state._pendingLevel !== undefined) {
    setLevel(state._pendingLevel);
    state._pendingLevel = null;
  }

  /* ── Quill-редакторы инициализируем последними ──
     Quill требует чтобы контейнер был виден в DOM   */
  state.addQuill = new Quill("#addQuillEditor", {
    theme:   "snow",
    placeholder: "Подробное описание...",
    modules: { toolbar: "#addQuillToolbar" },
  });

  state.editQuill = new Quill("#editQuillEditor", {
    theme:   "snow",
    placeholder: "Описание...",
    modules: { toolbar: "#editQuillToolbar" },
  });
});

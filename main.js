// main.js — добавить в начало импортов:
import { initAuthGuard, updateMenuProfile } from "./auth-guard.js";

// Убрать старый onAuthStateChanged и заменить на:

initAuthGuard((user, profile) => {
  // Пользователь авторизован и не забанен
  state.isAdmin = profile.role === "admin";

  // Показываем кнопки
  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) profileBtn.style.display = "flex";

  loginBtn.style.display   = "none";
  logoutBtn.style.display  = "";
  adminBadge.style.display = state.isAdmin ? "" : "none";
  addModeBtn.style.display = state.isAdmin ? "" : "none";

  // Обновляем профиль в меню
  updateMenuProfile(profile);

  // Запускаем карту
  const savedMap = localStorage.getItem("lastMap");
  const startMap = (savedMap && MAPS[savedMap]) ? savedMap : "groundzero";
  mapSelect.value = startMap;
  switchMap(startMap);
  checkUrlHash();

  // Quill
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
});

// logoutBtn
logoutBtn.onclick = () => signOut(auth).then(() => location.reload());

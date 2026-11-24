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
import { loadHouses }                      from "./houses.js";
import { loadZoomSettings,
         setZoomAdminVisible }             from "./settings.js";
import { downloadForOffline }              from "./offline.js";

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
  setZoomAdminVisible(state.isAdmin);
  addModeBtn.style.display = state.isAdmin ? "" : "none";
  if (!state.isAdmin) exitAddMode();
  refreshModalControls();

  if (profile?.banned) toast("Аккаунт заблокирован — доступен только просмотр", true);
}
initAuth(applyAuth);

/* ── Настройки зума (кнопки и щипок) ── */
loadZoomSettings();

/* ── Дома загружаются в фоне (из кеша и с сервера) ── */
const housesReady = loadHouses().catch(e => console.warn("Дома не загружены:", e));

/* ── Старт карты (не ждёт авторизации) ── */
async function start() {
  const h     = parseHash();
  const saved = localStorage.getItem("lastMap");
  /* Ссылка внутрь дома: ждём, пока дома зарегистрируются (но не дольше 3 секунд) */
  if (h.map && h.map.startsWith("house_")) {
    await Promise.race([housesReady, new Promise(r => setTimeout(r, 3000))]);
  }
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

/* ═══════════ Приложение (PWA) и офлайн-режим ═══════════ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW:", err));
  });
}

function updateNet() {
  document.body.classList.toggle("offline", navigator.onLine === false);
}
updateNet();
window.addEventListener("offline", () => { updateNet(); toast("Нет интернета: показаны сохранённые карты и метки"); });
window.addEventListener("online",  () => { updateNet(); toast("Интернет снова доступен"); });

/* Кнопка установки (если браузер её поддерживает) */
const installBtn = document.getElementById("installBtn");
let installEvent = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installEvent = e;
  installBtn.style.display = "";
});
installBtn.onclick = async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installBtn.style.display = "none";
};
window.addEventListener("appinstalled", () => { installBtn.style.display = "none"; });

/* Скачать все карты и метки для работы без интернета */
const offlineBtn  = document.getElementById("offlineBtn");
const OFFLINE_IDLE = "📥 Сохранить для офлайна";
offlineBtn.onclick = async () => {
  if (navigator.onLine === false) { toast("Для загрузки нужен интернет", true); return; }
  if (!confirm("Скачать все карты и метки для работы без интернета? Это около 10–20 МБ.")) return;
  offlineBtn.disabled = true;
  try {
    const r = await downloadForOffline((d, t) => { offlineBtn.textContent = `Сохранение ${d}/${t}…`; });
    toast(r.failed ? `Сохранено, не загрузилось файлов: ${r.failed}` : "Готово: карты и метки доступны без интернета");
    offlineBtn.textContent = "✅ Сохранено · обновить";
  } catch (e) {
    console.error(e);
    toast("Не удалось сохранить данные", true);
    offlineBtn.textContent = OFFLINE_IDLE;
  } finally {
    offlineBtn.disabled = false;
  }
};

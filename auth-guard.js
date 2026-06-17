// auth-guard.js — Проверка авторизации, бана, загрузка профиля

import { auth, db, onAuthStateChanged,
         ref, onValue, update }           from "./config.js";

const OVERLAY_ID = "authOverlay";

/* ── Создаём оверлей входа ── */
function createOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.innerHTML = `
    <div class="auth-box">
      <div class="auth-logo">панель авторизации</div>
      <div class="auth-sub">Интерактивная карта Escape from Tarkov</div>
      <button id="authGoogleBtn" class="btn btn-login auth-btn">
        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right:8px;vertical-align:middle">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        Войти через Google
      </button>
      <div class="auth-note">Требуется для доступа к карте</div>
    </div>
  `;
  el.style.display = "none";
  document.body.appendChild(el);

  document.getElementById("authGoogleBtn").onclick = () => {
  import("./config.js").then(m => {
    m.signInWithPopup(m.auth, m.provider).catch(e => alert(e.message));
  });
};
}

/* ── Экран бана ── */
function showBanScreen() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.innerHTML = `
    <div class="auth-box">
      <div class="auth-logo" style="color:#c0392b">⛔ ДОСТУП ЗАКРЫТ</div>
      <div class="auth-sub">Ваш аккаунт заблокирован администратором.</div>
      <div class="auth-note">Если вы считаете это ошибкой — свяжитесь с администратором.</div>
    </div>
  `;
}

/* ── Скрыть оверлей ── */
function hideOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.style.display = "none";
}

/* ── Показать оверлей ── */
function showOverlay() {
  let el = document.getElementById(OVERLAY_ID);
  if (!el) { createOverlay(); el = document.getElementById(OVERLAY_ID); }
  el.style.display = "flex";
}

/* ── Загрузить/создать профиль пользователя ── */
function loadUserProfile(user, callback) {
  const userRef = ref(db, `users/${user.uid}`);
  onValue(userRef, snap => {
    const data = snap.val();
    if (!data) {
      const profile = {
        nickname: user.displayName?.slice(0, 20) || "Сталкер",
        photoURL: user.photoURL || "",
        role:     "user",
        banned:   false,
        email:    user.email || "",
      };
      update(userRef, profile);
      callback(profile);
    } else {
    /* Проверяем срок доступа */
    if (data.accessExpiry && data.accessExpiry < Date.now() && (data.accessLevel ?? 0) > 0) {
      /* Срок истёк — сбрасываем уровень */
      update(ref(db, `users/${user.uid}`), { accessLevel: 0 });
      data.accessLevel = 0;
    }
    callback(data);
  }
  });
}

/* ── Обновить аватар в меню карты ── */
export function updateMenuProfile(profile) {
  const nickEl  = document.getElementById("menuNickname");
  const photoEl = document.getElementById("menuAvatar");
  if (nickEl)  nickEl.textContent = profile.nickname || "ЧВК";
  if (photoEl) {
    if (profile.photoURL) {
      photoEl.src = profile.photoURL;
      photoEl.style.display = "block";
    } else {
      photoEl.style.display = "none";
    }
  }
}

/* ── Главная функция — вызывается в main.js ── */
export function initAuthGuard(onReady) {
  createOverlay();

  let initialized = false;

  onAuthStateChanged(auth, user => {
    if (!user) {
      showOverlay();
      initialized = false;
      return;
    }

    loadUserProfile(user, profile => {
      if (profile.banned) {
        showOverlay();
        showBanScreen();
        return;
      }

      hideOverlay();
      updateMenuProfile(profile);

      if (!initialized) {
        initialized = true;
        onReady(user, profile);
      }
    });
  });
}

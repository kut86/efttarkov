// auth.js — Необязательная авторизация (карта доступна всем, вход скрыт под иконкой)

import { auth, db, provider, ref, get, update,
         signInWithPopup, onAuthStateChanged, signOut,
         signInWithEmailAndPassword, sendPasswordResetEmail } from "./config.js";
import { toast } from "./ui.js";

/* ── Загрузить/создать профиль пользователя ── */
async function loadUserProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  const data = snap.val();

  if (!data) {
    const profile = {
      nickname: user.displayName?.slice(0, 20) || "Сталкер",
      photoURL: user.photoURL || "",
      role:     "user",
      banned:   false,
      email:    user.email || "",
    };
    await update(userRef, profile);
    return profile;
  }

  /* Срок доступа истёк — сбрасываем уровень */
  if (data.accessExpiry && data.accessExpiry < Date.now() && (data.accessLevel ?? 0) > 0) {
    await update(userRef, { accessLevel: 0 });
    data.accessLevel = 0;
  }
  return data;
}

/* ── Скрытая панель входа: открывается ДВОЙНЫМ нажатием на иконку ── */
const icon      = document.getElementById("authIcon");
const panel     = document.getElementById("authPanel");
const guestView = document.getElementById("authGuestView");
const userView  = document.getElementById("authUserView");
const googleBtn = document.getElementById("authGoogleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const nickEl    = document.getElementById("menuNickname");
const photoEl   = document.getElementById("menuAvatar");
const noteEl    = document.getElementById("authNote");

function togglePanel(force) {
  const open = force ?? panel.hidden;
  panel.hidden = !open;
}

let lastTap = 0;
icon.addEventListener("pointerup", () => {
  const now = Date.now();
  if (now - lastTap < 400) { lastTap = 0; togglePanel(); }
  else lastTap = now;
});

document.addEventListener("pointerdown", e => {
  if (!panel.hidden && !e.target.closest("#authPanel, #authIcon")) togglePanel(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") togglePanel(false);
});

googleBtn.onclick = () => {
  signInWithPopup(auth, provider)
    .then(() => togglePanel(false))
    .catch(e => {
      if (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request") return;
      toast(e.message, true);
    });
};
logoutBtn.onclick = () => signOut(auth).then(() => togglePanel(false));

/* ── Вход по почте и паролю (аккаунт админа создаётся в консоли Firebase) ── */
const emailForm  = document.getElementById("authEmailForm");
const emailInput = document.getElementById("authEmail");
const passInput  = document.getElementById("authPassword");
const emailBtn   = document.getElementById("authEmailBtn");
const resetBtn   = document.getElementById("authResetBtn");

function authErrorText(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":      return "Неверная почта или пароль";
    case "auth/invalid-email":       return "Некорректный адрес почты";
    case "auth/user-disabled":       return "Аккаунт отключён";
    case "auth/too-many-requests":   return "Слишком много попыток. Подождите и повторите";
    case "auth/network-request-failed": return "Нет соединения с интернетом";
    case "auth/operation-not-allowed":  return "Вход по почте не включён в Firebase";
    default:                         return "Не удалось войти";
  }
}

emailForm.addEventListener("submit", async e => {
  e.preventDefault();
  emailBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
    passInput.value = "";
    togglePanel(false);
  } catch (err) {
    console.warn(err.code);
    toast(authErrorText(err.code), true);
  } finally {
    emailBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) { toast("Сначала введите почту", true); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    toast("Если такой аккаунт есть, письмо для сброса отправлено");
  } catch (err) {
    toast(authErrorText(err.code), true);
  }
});

function renderPanel(user, profile) {
  const loggedIn = !!user;
  guestView.hidden = loggedIn;
  userView.hidden  = !loggedIn;
  icon.classList.toggle("auth-icon--on", loggedIn);
  if (!loggedIn) return;

  nickEl.textContent = profile?.nickname || "ЧВК";
  if (profile?.photoURL) { photoEl.src = profile.photoURL; photoEl.style.display = "block"; }
  else photoEl.style.display = "none";
  noteEl.textContent = profile?.banned ? "Аккаунт заблокирован — доступен только просмотр" : "";
}

/* ── Главная функция. onChange(user|null, profile|null) вызывается при каждом входе/выходе ── */
export function initAuth(onChange) {
  renderPanel(null, null);
  onChange(null, null);                       // карта стартует сразу как для гостя

  onAuthStateChanged(auth, async user => {
    if (!user) { renderPanel(null, null); onChange(null, null); return; }
    try {
      const profile = await loadUserProfile(user);
      renderPanel(user, profile);
      onChange(user, profile);
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      renderPanel(user, null);
      onChange(null, null);                   // остаёмся гостем, карта не ломается
    }
  });
}

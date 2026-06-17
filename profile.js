// profile.js — Логика страницы профиля

import { auth, db, provider,
         ref, get, onValue, update,
         signInWithPopup, onAuthStateChanged,
         signOut }                              from "./config.js";
import { LEVELS, THREE_DAYS_MS }               from "./constants.js";
import { getExpiryStatus, formatExpiry }       from "./access-control.js";

/* ── DOM ── */
const profilePage     = document.getElementById("profilePage");
const authOverlay     = document.getElementById("authOverlay");
const profileAvatar   = document.getElementById("profileAvatar");
const profileAvatarPh = document.getElementById("profileAvatarPlaceholder");
const profileNickname = document.getElementById("profileNicknameDisplay");
const profileEmail    = document.getElementById("profileEmail");
const profileRoleEl   = document.getElementById("profileRole");
const nicknameInput   = document.getElementById("nicknameInput");
const photoInput      = document.getElementById("photoInput");
const photoPreviewBtn = document.getElementById("photoPreviewBtn");
const saveProfileBtn  = document.getElementById("saveProfileBtn");
const resetPhotoBtn   = document.getElementById("resetPhotoBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const adminPanel      = document.getElementById("adminPanel");
const usersList       = document.getElementById("usersList");
const adminSearch     = document.getElementById("adminSearch");
const toastCont       = document.getElementById("toastContainer");

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Валидация никнейма ── */
function validateNickname(val) {
  if (!val)            return "Никнейм не может быть пустым";
  if (val.length > 20) return "Максимум 20 символов";
  if (!/^[a-zA-Zа-яёА-ЯЁ0-9_\- ]+$/.test(val))
    return "Только буквы, цифры, пробел, _ и -";
  return null;
}

/* ── Аватар ── */
function setAvatar(url) {
  if (url) {
    profileAvatar.src          = url;
    profileAvatar.style.display    = "block";
    profileAvatarPh.style.display  = "none";
  } else {
    profileAvatar.style.display    = "none";
    profileAvatarPh.style.display  = "flex";
  }
}

/* ── Роль ── */
function renderRole(role) {
  const labels = { admin: "⚙️ Администратор", user: "👤 Пользователь" };
  profileRoleEl.textContent = labels[role] || role;
  profileRoleEl.className   = "profile-role role-" + (role || "user");
}

/* ── Баннер уровня доступа ── */
function renderAccessBanner(profile) {
  const old = document.getElementById("accessBanner");
  if (old) old.remove();

  const level  = profile.accessLevel ?? 0;
  const expiry = profile.accessExpiry ?? null;
  const status = getExpiryStatus(expiry);
  const info   = LEVELS[level] ?? LEVELS[0];

  const banner = document.createElement("div");
  banner.id = "accessBanner";
  banner.style.cssText = `
    margin: 0 20px 0;
    padding: 12px 16px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `;

  let inner = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:10px;
                color:var(--text-dim);letter-spacing:.12em;text-transform:uppercase;
                margin-bottom:2px">Уровень доступа</div>
    <div style="font-size:16px;font-weight:700;color:var(--text-bright)">
      ${info.icon} ${info.name}
    </div>`;

  if (level > 0 && expiry) {
    const days = Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));

    if (status === "expired") {
      inner += `
        <div style="background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);
                    border-radius:6px;padding:8px 12px;font-size:12px;color:#c0392b;margin-top:4px">
          ⛔ Срок доступа истёк. Обратитесь к администратору.
        </div>`;
      banner.style.background = "rgba(192,57,43,.05)";
      banner.style.border     = "1px solid rgba(192,57,43,.3)";
    } else if (status === "soon") {
      inner += `
        <div style="background:rgba(230,126,34,.15);border:1px solid rgba(230,126,34,.4);
                    border-radius:6px;padding:8px 12px;font-size:12px;color:#e67e22;margin-top:4px">
          ⚠️ Доступ истекает через ${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}
          — ${formatExpiry(expiry)}
        </div>`;
      banner.style.background = "rgba(230,126,34,.05)";
      banner.style.border     = "1px solid rgba(230,126,34,.3)";
    } else {
      inner += `
        <div style="font-size:12px;color:var(--text-dim);margin-top:2px">
          Действует до ${formatExpiry(expiry)}
        </div>`;
      banner.style.background = "var(--surface2)";
      banner.style.border     = "1px solid var(--border)";
    }
  } else if (level > 0) {
    inner += `
      <div style="font-size:12px;color:var(--text-dim);margin-top:2px">∞ Бессрочно</div>`;
    banner.style.background = "var(--surface2)";
    banner.style.border     = "1px solid var(--border)";
  } else {
    banner.style.background = "var(--surface2)";
    banner.style.border     = "1px solid var(--border)";
  }

  banner.innerHTML = inner;
  const card = document.querySelector(".profile-card");
  if (card) card.after(banner);
}

/* ── Список пользователей (только для админа) ── */
let usersUnsubscribe = null;

function loadUsers(currentUid) {
  if (usersUnsubscribe) return;   // уже подписаны

  /* Используем уже импортированные db, ref, onValue — без динамического импорта */
  const usersRef = ref(db, "users");
  usersUnsubscribe = onValue(usersRef, snap => {
    const all = [];
    snap.forEach(child => all.push({ uid: child.key, ...child.val() }));
    renderUsers(all, currentUid);
  });

  adminSearch.addEventListener("input", () => {
    const q = adminSearch.value.toLowerCase();
    usersList.querySelectorAll(".user-card").forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ── Карточки пользователей ── */
function renderUsers(users, currentUid) {
  usersList.innerHTML = "";
  users.forEach(u => {
    const isAdmin = u.role === "admin";
    const isSelf  = u.uid === currentUid;
    const lvlInfo = LEVELS[u.accessLevel ?? 0] ?? LEVELS[0];

    const card = document.createElement("div");
    card.className = "user-card" + (u.banned ? " user-banned" : "");
    card.innerHTML = `
      <div class="user-card-info">
        <img class="user-card-avatar" src="${u.photoURL || ""}"
             onerror="this.style.display='none'"
             style="${u.photoURL ? "" : "display:none"}">
        <div class="user-card-text">
          <div class="user-card-nick">
            ${esc(u.nickname || "—")}
            ${isSelf ? "<span class='user-self'>(вы)</span>" : ""}
          </div>
          <div class="user-card-email">${esc(u.email || "")}</div>
          <div class="user-card-role">
            ${isAdmin ? "⚙️ Админ" : "👤 Пользователь"}
            · ${lvlInfo.icon} ${lvlInfo.name}
            ${u.banned ? "· 🔴 Заблокирован" : ""}
          </div>
        </div>
      </div>
      ${!isSelf ? `
      <div class="user-card-actions">
        <button class="btn btn-sm ${u.banned ? "btn-primary" : "btn-danger"}"
                data-uid="${u.uid}" data-action="ban">
          ${u.banned ? "Разбанить" : "Забанить"}
        </button>
        <button class="btn btn-sm ${isAdmin ? "btn-danger" : ""}"
                data-uid="${u.uid}" data-action="role">
          ${isAdmin ? "Разжаловать" : "Сделать админом"}
        </button>
      </div>` : ""}
    `;

    card.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = () => handleUserAction(btn, u, isAdmin);
    });

    usersList.appendChild(card);
  });
}

/* ── Действия с пользователем ── */
function handleUserAction(btn, u, isAdmin) {
  const PROTECTED_EMAIL = "pinachet160@gmail.com";
  if (u.email === PROTECTED_EMAIL) {
    toast("Нельзя изменить главного администратора", true);
    return;
  }

  const uRef = ref(db, `users/${u.uid}`);
  if (btn.dataset.action === "ban") {
    update(uRef, { banned: !u.banned })
      .then(() => toast(u.banned ? "Пользователь разбанен" : "Пользователь заблокирован"))
      .catch(e => toast(e.message, true));
  }
  if (btn.dataset.action === "role") {
    update(uRef, { role: isAdmin ? "user" : "admin" })
      .then(() => toast(isAdmin ? "Роль снята" : "Назначен администратором"))
      .catch(e => toast(e.message, true));
  }
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g,  "&quot;");
}

/* ──────────────────────────────────────────────
   ОСНОВНОЙ ПОТОК
   ────────────────────────────────────────────── */
onAuthStateChanged(auth, async user => {
  if (!user) {
    authOverlay.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo">ТАКТИК</div>
        <div class="auth-sub">Войдите чтобы просмотреть профиль</div>
        <button id="authGoogleBtn" class="btn btn-login auth-btn">Войти через Google</button>
      </div>`;
    authOverlay.style.display = "flex";
    document.getElementById("authGoogleBtn").onclick = () =>
      signInWithPopup(auth, provider).catch(e => toast(e.message, true));
    return;
  }

  const userRef = ref(db, `users/${user.uid}`);

  /* Однократное чтение профиля */
  let profile;
  try {
    const snap = await get(userRef);
    profile    = snap.val();
  } catch (e) {
    toast("Ошибка загрузки профиля", true);
    return;
  }

  /* Первый вход — создаём профиль */
  if (!profile) {
    profile = {
      nickname: (user.displayName || "Сталкер").slice(0, 20),
      photoURL: user.photoURL || "",
      role:     "user",
      banned:   false,
      email:    user.email || "",
    };
    await update(userRef, profile);
  }

  /* Бан */
  if (profile.banned) {
    authOverlay.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo" style="color:#c0392b">⛔ ДОСТУП ЗАКРЫТ</div>
        <div class="auth-sub">Ваш аккаунт заблокирован.</div>
      </div>`;
    authOverlay.style.display = "flex";
    profilePage.style.display = "none";
    return;
  }

  /* Показываем страницу */
  authOverlay.style.display = "none";
  profilePage.style.display = "block";

  setAvatar(profile.photoURL);
  profileNickname.textContent = profile.nickname || "Сталкер";
  profileEmail.textContent    = user.email || "";
 /* nicknameInput.value         = profile.nickname || "";
  photoInput.value            = profile.photoURL || ""; */
  renderRole(profile.role);
  renderAccessBanner(profile);

  if (profile.role === "admin") {
    adminPanel.style.display = "block";
    loadUsers(user.uid);
  }

  /* ── Кнопки ── */
  /*saveProfileBtn.onclick = () => {
    const nick = nicknameInput.value.trim();
    const err  = validateNickname(nick);
    if (err) { toast(err, true); return; }
    const photo = photoInput.value.trim();
    update(userRef, { nickname: nick, photoURL: photo })
      .then(() => {
        toast("Профиль сохранён");
        setAvatar(photo);
        profileNickname.textContent = nick;
      })
      .catch(e => toast(e.message, true));
  };

  resetPhotoBtn.onclick = () => {
    photoInput.value = user.photoURL || "";
    toast("Фото сброшено к Google-аккаунту");
  };

  photoPreviewBtn.onclick = () => {
    const url = photoInput.value.trim();
    url ? setAvatar(url) : toast("Введите URL фото", true);
  }; */

  logoutBtn.onclick = () => signOut(auth).then(() => location.href = "index.html");
});

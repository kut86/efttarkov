// profile.js — Логика страницы профиля 

import { auth, db, provider,
         ref, onValue, update,
         signInWithPopup, onAuthStateChanged,
         signOut }                         from "./config.js";

/* ── DOM ── */
const profilePage      = document.getElementById("profilePage");
const authOverlay      = document.getElementById("authOverlay");
const profileAvatar    = document.getElementById("profileAvatar");
const profileAvatarPh  = document.getElementById("profileAvatarPlaceholder");
const profileNickname  = document.getElementById("profileNicknameDisplay");
const profileEmail     = document.getElementById("profileEmail");
const profileRoleEl    = document.getElementById("profileRole");
const nicknameInput    = document.getElementById("nicknameInput");
const photoInput       = document.getElementById("photoInput");
const photoPreviewBtn  = document.getElementById("photoPreviewBtn");
const saveProfileBtn   = document.getElementById("saveProfileBtn");
const resetPhotoBtn    = document.getElementById("resetPhotoBtn");
const logoutBtn        = document.getElementById("logoutBtn");
const adminPanel       = document.getElementById("adminPanel");
const usersList        = document.getElementById("usersList");
const adminSearch      = document.getElementById("adminSearch");
const toastCont        = document.getElementById("toastContainer");

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
  if (!val) return "Никнейм не может быть пустым";
  if (val.length > 20) return "Максимум 20 символов";
  if (!/^[a-zA-Zа-яёА-ЯЁ0-9_\- ]+$/.test(val)) return "Только буквы, цифры, пробел, _ и -";
  return null;
}

/* ── Обновить отображение аватара ── */
function setAvatar(url) {
  if (url) {
    profileAvatar.src = url;
    profileAvatar.style.display = "block";
    profileAvatarPh.style.display = "none";
  } else {
    profileAvatar.style.display = "none";
    profileAvatarPh.style.display = "flex";
  }
}

/* ── Рендер роли ── */
function renderRole(role) {
  const labels = { admin: "⚙️ Администратор", user: "👤 Пользователь" };
  profileRoleEl.textContent = labels[role] || role;
  profileRoleEl.className   = "profile-role role-" + (role || "user");
}

/* ── Уровни доступа ── */
const LEVELS = {
  0: { name: "Standard",           icon: "🪖" },
  1: { name: "Left Behind",        icon: "🎯" },
  2: { name: "Prepare for Escape", icon: "⚔️" },
  3: { name: "Edge of Darkness",   icon: "💀" },
  4: { name: "Unheard",            icon: "👁" },
};

/* ── Баннер уровня доступа ── */
function renderAccessBanner(profile) {
  /* Удаляем старый баннер если есть */
  const old = document.getElementById("accessBanner");
  if (old) old.remove();

  const level = profile.accessLevel ?? 0;
  const expiry = profile.accessExpiry;
  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  /* Создаём блок уровня доступа */
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

  let bannerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:10px;
                color:var(--text-dim);letter-spacing:.12em;text-transform:uppercase;
                margin-bottom:2px">Уровень доступа</div>
    <div style="font-size:16px;font-weight:700;color:var(--text-bright)">
      ${LEVELS[level]?.icon} ${LEVELS[level]?.name}
    </div>
  `;

  if (expiry && level > 0) {
    const diff = expiry - now;
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

    if (diff < 0) {
      /* Истёк */
      bannerHTML += `
        <div style="background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.4);
                    border-radius:6px;padding:8px 12px;font-size:12px;color:#c0392b;margin-top:4px">
          ⛔ Срок доступа истёк. Обратитесь к администратору.
        </div>`;
      banner.style.background = "rgba(192,57,43,.05)";
      banner.style.border = "1px solid rgba(192,57,43,.3)";
    } else if (diff < THREE_DAYS) {
      /* Скоро истекает */
      bannerHTML += `
        <div style="background:rgba(230,126,34,.15);border:1px solid rgba(230,126,34,.4);
                    border-radius:6px;padding:8px 12px;font-size:12px;color:#e67e22;margin-top:4px">
          ⚠️ Доступ истекает через ${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"} 
          — ${new Date(expiry).toLocaleDateString("ru-RU")}
        </div>`;
      banner.style.background = "rgba(230,126,34,.05)";
      banner.style.border = "1px solid rgba(230,126,34,.3)";
    } else {
      /* Всё нормально */
      bannerHTML += `
        <div style="font-size:12px;color:var(--text-dim);margin-top:2px">
          Действует до ${new Date(expiry).toLocaleDateString("ru-RU")}
        </div>`;
      banner.style.background = "var(--surface2)";
      banner.style.border = "1px solid var(--border)";
    }
  } else if (level > 0) {
    bannerHTML += `
      <div style="font-size:12px;color:var(--text-dim);margin-top:2px">∞ Бессрочно</div>`;
    banner.style.background = "var(--surface2)";
    banner.style.border = "1px solid var(--border)";
  } else {
    banner.style.background = "var(--surface2)";
    banner.style.border = "1px solid var(--border)";
  }

  banner.innerHTML = bannerHTML;

  /* Вставляем после карточки профиля */
  const card = document.querySelector(".profile-card");
  if (card) card.after(banner);
}

/* ── Загрузить список пользователей (только для админа) ── */
function loadUsers(currentUid) {
  const usersRef = ref(db, "users");
  onValue(usersRef, snap => {
    const all = [];
    snap.forEach(child => {
      all.push({ uid: child.key, ...child.val() });
    });
    renderUsers(all, currentUid);
  });

  adminSearch.addEventListener("input", () => {
    const q = adminSearch.value.toLowerCase();
    const items = usersList.querySelectorAll(".user-card");
    items.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? "" : "none";
    });
  });
}

/* ── Рендер карточек пользователей ── */
function renderUsers(users, currentUid) {
  usersList.innerHTML = "";
  users.forEach(u => {
    const card = document.createElement("div");
    card.className = "user-card" + (u.banned ? " user-banned" : "");

    const isAdmin  = u.role === "admin";
    const isSelf   = u.uid === currentUid;

    card.innerHTML = `
      <div class="user-card-info">
        <img class="user-card-avatar" src="${u.photoURL || ""}" 
             onerror="this.style.display='none'"
             style="${u.photoURL ? "" : "display:none"}">
        <div class="user-card-text">
          <div class="user-card-nick">${esc(u.nickname || "—")} ${isSelf ? "<span class='user-self'>(вы)</span>" : ""}</div>
          <div class="user-card-email">${esc(u.email || "")}</div>
          <div class="user-card-role">${isAdmin ? "⚙️ Админ" : "👤 Пользователь"} ${u.banned ? "· 🔴 Заблокирован" : ""}</div>
        </div>
      </div>
      <div class="user-card-actions">
        ${!isSelf ? `
          <button class="btn btn-sm ${u.banned ? "btn-primary" : "btn-danger"}" 
                  data-uid="${u.uid}" data-action="ban">
            ${u.banned ? "Разбанить" : "Забанить"}
          </button>
          <button class="btn btn-sm ${isAdmin ? "btn-danger" : ""}" 
                  data-uid="${u.uid}" data-action="role">
            ${isAdmin ? "Разжаловать" : "Сделать админом"}
          </button>
        ` : ""}
      </div>
    `;

    card.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = () => {
        const uid    = btn.dataset.uid;
        const action = btn.dataset.action;
        const uRef   = ref(db, `users/${uid}`);
        if (action === "ban") {
  if (u.email === "pinachet160@gmail.com") {
    toast("Нельзя заблокировать главного администратора", true);
    return;
  }
  update(uRef, { banned: !u.banned })
    .then(() => toast(u.banned ? "Пользователь разбанен" : "Пользователь заблокирован"));
}
        if (action === "role") {
  if (u.email === "pinachet160@gmail.com") {
    toast("Нельзя изменить роль главного администратора", true);
    return;
  }
  update(uRef, { role: isAdmin ? "user" : "admin" })
    .then(() => toast(isAdmin ? "Роль снята" : "Назначен администратором"));
}
      };
    });

    usersList.appendChild(card);
  });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── Основной поток ── */
onAuthStateChanged(auth, user => {
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

  onValue(userRef, snap => {
    let profile = snap.val();

    /* Первый вход — создаём профиль */
    if (!profile) {
      profile = {
        nickname: (user.displayName || "Сталкер").slice(0, 20),
        photoURL: user.photoURL || "",
        role:     "user",
        banned:   false,
        email:    user.email || "",
      };
      update(userRef, profile);
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

    /* Заполняем данные */
    setAvatar(profile.photoURL);
    profileNickname.textContent = profile.nickname || "Сталкер";
    profileEmail.textContent    = user.email || "";
    nicknameInput.value         = profile.nickname || "";
    photoInput.value            = profile.photoURL || "";
    renderRole(profile.role);
    renderAccessBanner(profile);

    /* Админ-панель */
    if (profile.role === "admin") {
      adminPanel.style.display = "block";
      loadUsers(user.uid);
    }
  });

  /* Кнопки */
  saveProfileBtn.onclick = () => {
    const nick = nicknameInput.value.trim();
    const err  = validateNickname(nick);
    if (err) { toast(err, true); return; }

    const photo = photoInput.value.trim();
    update(ref(db, `users/${user.uid}`), {
      nickname: nick,
      photoURL: photo,
    }).then(() => {
      toast("Профиль сохранён");
      setAvatar(photo);
      profileNickname.textContent = nick;
    }).catch(e => toast(e.message, true));
  };

  resetPhotoBtn.onclick = () => {
    photoInput.value = user.photoURL || "";
    toast("Фото сброшено к Google-аккаунту");
  };

  photoPreviewBtn.onclick = () => {
    const url = photoInput.value.trim();
    if (url) setAvatar(url);
    else toast("Введите URL фото", true);
  };

  logoutBtn.onclick = () => signOut(auth).then(() => location.href = "index.html");
});

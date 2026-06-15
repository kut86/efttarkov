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

/* access.js — Управление уровнями доступа */

import { auth, db, provider,
         ref, onValue, update,
         signInWithPopup, onAuthStateChanged } from "./config.js";

const LEVELS = {
  0: { name: "Standard",           icon: "🪖" },
  1: { name: "Left Behind",        icon: "🎯" },
  2: { name: "Prepare for Escape", icon: "⚔️" },
  3: { name: "Edge of Darkness",   icon: "💀" },
  4: { name: "Unheard",            icon: "👁" },
};

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

/* ── DOM ── */
const authOverlay    = document.getElementById("authOverlay");
const accessPage     = document.getElementById("accessPage");
const usersList      = document.getElementById("usersList");
const searchInput    = document.getElementById("searchInput");
const levelFilter    = document.getElementById("levelFilter");
const statusFilter   = document.getElementById("statusFilter");
const accessModal    = document.getElementById("accessModal");
const accessModalClose  = document.getElementById("accessModalClose");
const accessModalCancel = document.getElementById("accessModalCancel");
const accessModalSave   = document.getElementById("accessModalSave");
const levelButtons   = document.getElementById("levelButtons");
const expiryDate     = document.getElementById("expiryDate");
const accessNote     = document.getElementById("accessNote");
const toastCont      = document.getElementById("toastContainer");

/* ── Stats DOM ── */
const statTotal    = document.getElementById("statTotal");
const statActive   = document.getElementById("statActive");
const statExpiring = document.getElementById("statExpiring");
const statBanned   = document.getElementById("statBanned");

/* ── State ── */
let allUsers     = [];
let currentEdit  = null;
let selectedLevel = 0;
let selectedExpiry = null;

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Форматирование даты ── */
function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function getExpiryStatus(expiry) {
  if (!expiry) return "forever";
  const now  = Date.now();
  const diff = expiry - now;
  if (diff < 0)          return "expired";
  if (diff < THREE_DAYS) return "soon";
  return "ok";
}

/* ── Обновить статистику ── */
function updateStats(users) {
  const now = Date.now();
  let active = 0, expiring = 0, banned = 0;
  users.forEach(u => {
    if (u.banned) { banned++; return; }
    active++;
    if (u.accessExpiry && (u.accessExpiry - now) < THREE_DAYS && (u.accessExpiry - now) > 0) {
      expiring++;
    }
  });
  statTotal.textContent    = users.length;
  statActive.textContent   = active;
  statExpiring.textContent = expiring;
  statBanned.textContent   = banned;
}

/* ── Рендер карточки ── */
function renderCard(u) {
  const card = document.createElement("div");
  const status = getExpiryStatus(u.accessExpiry);
  const level  = u.accessLevel ?? 0;

  let cardClass = "access-user-card";
  if (u.banned)          cardClass += " banned";
  else if (status === "expired") cardClass += " expired";
  else if (status === "soon")    cardClass += " expiring";
  card.className = cardClass;

  let expiryHTML = "";
  if (!u.accessExpiry) {
    expiryHTML = `<span class="access-expiry-badge expiry-forever">∞ Бессрочно</span>`;
  } else if (status === "expired") {
    expiryHTML = `<span class="access-expiry-badge expiry-expired">⛔ Истёк ${formatDate(u.accessExpiry)}</span>`;
  } else if (status === "soon") {
    expiryHTML = `<span class="access-expiry-badge expiry-soon">⚠️ до ${formatDate(u.accessExpiry)}</span>`;
  } else {
    expiryHTML = `<span class="access-expiry-badge expiry-ok">до ${formatDate(u.accessExpiry)}</span>`;
  }

  card.innerHTML = `
    <div class="access-card-left">
      <img class="access-card-avatar"
           src="${u.photoURL || ""}"
           onerror="this.style.display='none'"
           style="${u.photoURL ? "" : "display:none"}">
      <div class="access-card-info">
        <div class="access-card-nick">${esc(u.nickname || "—")} ${u.banned ? "🔴" : ""}</div>
        <div class="access-card-email">${esc(u.email || "")}</div>
        <div class="access-card-meta">
          <span class="access-level-badge level-${level}">
            ${LEVELS[level]?.icon} ${LEVELS[level]?.name}
          </span>
          ${expiryHTML}
          ${u.accessNote ? `<span class="access-expiry-badge expiry-ok">📝 ${esc(u.accessNote)}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="access-card-right">
      <button class="btn btn-sm" data-uid="${u.uid}">Изменить</button>
    </div>
  `;

  card.querySelector("button").onclick = () => openModal(u);
  return card;
}

/* ── Фильтрация ── */
function applyFilters() {
  const q      = searchInput.value.toLowerCase();
  const lvl    = levelFilter.value;
  const status = statusFilter.value;
  const now    = Date.now();

  usersList.innerHTML = "";
  allUsers.forEach(u => {
    if (q && !( (u.nickname||"").toLowerCase().includes(q) ||
                (u.email||"").toLowerCase().includes(q) )) return;
    if (lvl !== "all" && String(u.accessLevel ?? 0) !== lvl) return;

    const es = getExpiryStatus(u.accessExpiry);
    if (status === "active"   && (u.banned || es === "expired")) return;
    if (status === "expiring" && es !== "soon")    return;
    if (status === "expired"  && es !== "expired") return;
    if (status === "banned"   && !u.banned)        return;

    usersList.appendChild(renderCard(u));
  });
}

searchInput.addEventListener("input",  applyFilters);
levelFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change",applyFilters);

/* ── Открыть модалку ── */
function openModal(u) {
  currentEdit    = u;
  selectedLevel  = u.accessLevel ?? 0;
  selectedExpiry = u.accessExpiry || null;

  document.getElementById("modalUserNick").textContent  = u.nickname || "—";
  document.getElementById("modalUserEmail").textContent = u.email    || "";
  const av = document.getElementById("modalUserAvatar");
  av.src = u.photoURL || "";
  av.style.display = u.photoURL ? "" : "none";

  accessNote.value = u.accessNote || "";

  /* Кнопки уровней */
  levelButtons.querySelectorAll(".level-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.level) === selectedLevel);
  });

  /* Дата */
  expiryDate.value = selectedExpiry
    ? new Date(selectedExpiry).toISOString().split("T")[0]
    : "";

  /* Сброс активных expiry-btn */
  document.querySelectorAll(".expiry-btn").forEach(b => b.classList.remove("active"));

  accessModal.style.display = "flex";
}

/* ── Закрыть модалку ── */
function closeModal() {
  accessModal.style.display = "none";
  currentEdit = null;
}

accessModalClose.onclick  = closeModal;
accessModalCancel.onclick = closeModal;
accessModal.addEventListener("click", e => { if (e.target === accessModal) closeModal(); });

/* ── Выбор уровня ── */
levelButtons.querySelectorAll(".level-btn").forEach(btn => {
  btn.onclick = () => {
    selectedLevel = Number(btn.dataset.level);
    levelButtons.querySelectorAll(".level-btn").forEach(b =>
      b.classList.toggle("active", b === btn)
    );
  };
});

/* ── Быстрый выбор срока ── */
document.querySelectorAll(".expiry-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".expiry-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const days = Number(btn.dataset.days);
    if (days === 0) {
      selectedExpiry = null;
      expiryDate.value = "";
    } else {
      selectedExpiry = Date.now() + days * 24 * 60 * 60 * 1000;
      expiryDate.value = new Date(selectedExpiry).toISOString().split("T")[0];
    }
  };
});

/* ── Изменение даты вручную ── */
expiryDate.addEventListener("change", () => {
  document.querySelectorAll(".expiry-btn").forEach(b => b.classList.remove("active"));
  selectedExpiry = expiryDate.value
    ? new Date(expiryDate.value).getTime()
    : null;
});

/* ── Сохранить ── */
accessModalSave.onclick = () => {
  if (!currentEdit) return;
  const uRef = ref(db, `users/${currentEdit.uid}`);
  update(uRef, {
    accessLevel:  selectedLevel,
    accessExpiry: selectedExpiry || null,
    accessNote:   accessNote.value.trim() || null,
  }).then(() => {
    toast(`Доступ обновлён: ${LEVELS[selectedLevel]?.name}`);
    closeModal();
  }).catch(e => toast(e.message, true));
};

/* ── Escape ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

function esc(s) {
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ── Auth ── */
onAuthStateChanged(auth, user => {
  if (!user) {
    authOverlay.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo">ТАКТИК</div>
        <div class="auth-sub">Требуется авторизация</div>
        <button id="authBtn" class="btn btn-login auth-btn">Войти через Google</button>
      </div>`;
    authOverlay.style.display = "flex";
    document.getElementById("authBtn").onclick = () =>
      signInWithPopup(auth, provider).catch(e => toast(e.message, true));
    return;
  }

  /* Проверяем что это админ */
  const userRef = ref(db, `users/${user.uid}`);
  onValue(userRef, snap => {
    const profile = snap.val();
    if (!profile || profile.role !== "admin") {
      authOverlay.innerHTML = `
        <div class="auth-box">
          <div class="auth-logo" style="color:#c0392b">⛔ НЕТ ДОСТУПА</div>
          <div class="auth-sub">Эта страница только для администраторов.</div>
          <a href="index.html" class="btn btn-sm" style="margin-top:8px">← На карту</a>
        </div>`;
      authOverlay.style.display = "flex";
      return;
    }

    authOverlay.style.display = "none";
    accessPage.style.display  = "block";

    /* Загружаем пользователей */
    const usersRef = ref(db, "users");
    onValue(usersRef, snap => {
      allUsers = [];
      snap.forEach(child => {
        allUsers.push({ uid: child.key, ...child.val() });
      });
      updateStats(allUsers);
      applyFilters();
    });
  }, { onlyOnce: true });
});

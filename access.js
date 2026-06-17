// access.js — Управление уровнями доступа

import {
  auth, db, provider,
  ref, get, onValue, update,
  signInWithPopup, onAuthStateChanged
} from "./config.js";

import { LEVELS, THREE_DAYS_MS } from "./constants.js";
import { getExpiryStatus, formatExpiry } from "./access-control.js";

/* ── DOM ── */
const authOverlay       = document.getElementById("authOverlay");
const accessPage        = document.getElementById("accessPage");
const usersList         = document.getElementById("usersList");
const searchInput       = document.getElementById("searchInput");
const levelFilter       = document.getElementById("levelFilter");
const statusFilter      = document.getElementById("statusFilter");
const accessModal       = document.getElementById("accessModal");
const accessModalClose  = document.getElementById("accessModalClose");
const accessModalCancel = document.getElementById("accessModalCancel");
const accessModalSave   = document.getElementById("accessModalSave");
const levelButtons      = document.getElementById("levelButtons");
const expiryDate        = document.getElementById("expiryDate");
const accessNote        = document.getElementById("accessNote");
const toastCont         = document.getElementById("toastContainer");

const statTotal    = document.getElementById("statTotal");
const statActive   = document.getElementById("statActive");
const statExpiring = document.getElementById("statExpiring");
const statBanned   = document.getElementById("statBanned");

/* ── State ── */
let allUsers      = [];
let currentEdit   = null;
let selectedLevel  = 0;
let selectedExpiry = null;

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Escape ── */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Статистика ── */
function updateStats(users) {
  const now = Date.now();
  let active = 0, expiring = 0, banned = 0;

  users.forEach(u => {
    if (u.banned) { banned++; return; }
    active++;
    if (u.accessExpiry) {
      const diff = u.accessExpiry - now;
      if (diff > 0 && diff < THREE_DAYS_MS) expiring++;
    }
  });

  statTotal.textContent = users.length;
  statActive.textContent = active;
  statExpiring.textContent = expiring;
  statBanned.textContent = banned;
}

/* ── Рендер карточки пользователя ── */
function renderCard(u) {
  const card = document.createElement("div");
  const status = getExpiryStatus(u.accessExpiry);
  const level = u.accessLevel ?? 0;

  let cls = "access-user-card";
  if (u.banned) cls += " banned";
  else if (status === "expired") cls += " expired";
  else if (status === "soon") cls += " expiring";

  card.className = cls;

  let expiryHTML = "";

  if (!u.accessExpiry) {
    expiryHTML = `<span class="access-expiry-badge">∞ Бессрочно</span>`;
  } else {
    expiryHTML = `<span class="access-expiry-badge">${formatExpiry(u.accessExpiry)}</span>`;
  }

  card.innerHTML = `
    <div class="access-card-left">
      <img src="${u.photoURL || ""}" style="${u.photoURL ? "" : "display:none"}">
      <div>
        <div>${esc(u.nickname || "—")} ${u.banned ? "🔴" : ""}</div>
        <div>${esc(u.email || "")}</div>
        <div>
          ${LEVELS[level]?.icon} ${LEVELS[level]?.name}
          · ${expiryHTML}
        </div>
      </div>
    </div>
    <div class="access-card-right">
      <button class="btn btn-sm">Изменить</button>
    </div>
  `;

  card.querySelector("button").onclick = () => openModal(u);
  return card;
}

/* ── Фильтры ── */
function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const lvl = levelFilter.value;
  const status = statusFilter.value;

  usersList.innerHTML = "";

  allUsers.forEach(u => {
    if (q && !(u.nickname || "").toLowerCase().includes(q) &&
             !(u.email || "").toLowerCase().includes(q)) return;

    if (lvl !== "all" && String(u.accessLevel ?? 0) !== lvl) return;

    const es = getExpiryStatus(u.accessExpiry);

    if (status === "active" && (u.banned || es === "expired")) return;
    if (status === "expiring" && es !== "soon") return;
    if (status === "expired" && es !== "expired") return;
    if (status === "banned" && !u.banned) return;

    usersList.appendChild(renderCard(u));
  });
}

/* ── Модалка ── */
function openModal(u) {
  currentEdit = u;
  selectedLevel = u.accessLevel ?? 0;
  selectedExpiry = u.accessExpiry ?? null;

  document.getElementById("modalUserNick").textContent = u.nickname || "—";
  document.getElementById("modalUserEmail").textContent = u.email || "";

  const av = document.getElementById("modalUserAvatar");
  av.src = u.photoURL || "";
  av.style.display = u.photoURL ? "" : "none";

  accessNote.value = u.accessNote || "";

  levelButtons.querySelectorAll(".level-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.level) === selectedLevel);
  });

  expiryDate.value = selectedExpiry
    ? new Date(selectedExpiry).toISOString().split("T")[0]
    : "";

  accessModal.style.display = "flex";
}

function closeModal() {
  accessModal.style.display = "none";
  currentEdit = null;
}

accessModalClose.onclick = closeModal;
accessModalCancel.onclick = closeModal;

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* ──────────────────────────────────────────────
   🔥 FIX: ИНИЦИАЛИЗАЦИЯ КНОПОК УРОВНЕЙ
────────────────────────────────────────────── */
function initLevelButtons() {
  if (!levelButtons) return;

  levelButtons.querySelectorAll(".level-btn").forEach(btn => {
    btn.onclick = () => {
      selectedLevel = Number(btn.dataset.level);

      levelButtons.querySelectorAll(".level-btn").forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");
    };
  });
}

/* ── SAVE ── */
accessModalSave.onclick = () => {
  if (!currentEdit) return;

  update(ref(db, `users/${currentEdit.uid}`), {
    accessLevel: selectedLevel,
    accessExpiry: selectedExpiry || null,
    accessNote: accessNote.value.trim() || null,
  }).then(() => {
    toast("Доступ обновлён");
    closeModal();
  }).catch(e => toast(e.message, true));
};

/* ──────────────────────────────────────────────
   AUTH
────────────────────────────────────────────── */
onAuthStateChanged(auth, async user => {
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

  const userRef = ref(db, `users/${user.uid}`);

  const snap = await get(userRef);
  const profile = snap.val();

  if (!profile || profile.role !== "admin") {
    authOverlay.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo" style="color:#c0392b">⛔ НЕТ ДОСТУПА</div>
        <div class="auth-sub">Только для администраторов</div>
      </div>`;
    authOverlay.style.display = "flex";
    return;
  }

  authOverlay.style.display = "none";
  accessPage.style.display = "block";

  /* 🔥 FIX: теперь точно после появления страницы */
  setTimeout(() => {
    initLevelButtons();
  }, 0);

  onValue(ref(db, "users"), snap => {
    allUsers = [];
    snap.forEach(child => {
      allUsers.push({ uid: child.key, ...child.val() });
    });

    updateStats(allUsers);
    applyFilters();
  });
});

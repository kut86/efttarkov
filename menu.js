// menu.js — Боковое меню: открытие, закрытие, Escape

const menuToggle = document.getElementById("menuToggle");
const menuPanel  = document.getElementById("menuPanel");

if (!menuToggle || !menuPanel) {
  console.warn("menu.js: элементы menuToggle или menuPanel не найдены");
} else {

  /* ── Открыть / закрыть ── */
  function openMenu() {
    menuPanel.classList.add("open");
    menuToggle.textContent = "✕";
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menuPanel.classList.remove("open");
    menuToggle.textContent = "☰";
    menuToggle.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return menuPanel.classList.contains("open");
  }

  /* ── Кнопка бургера ── */
  menuToggle.addEventListener("click", e => {
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  /* ── Клик вне меню — закрываем ── */
  document.addEventListener("click", e => {
    if (!isOpen()) return;
    if (e.target.closest(".menu-panel")) return;   // внутри меню — не закрываем
    closeMenu();
  });

  /* ── Escape — закрываем ── */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && isOpen()) closeMenu();
  });

}

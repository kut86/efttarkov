// hover.js — Подсказка при наведении (ПК): картинка + текст
// Рисуется поверх страницы в пикселях экрана, поэтому размер НЕ зависит от масштаба карты.
// Настройки каждой метки: noPvImg / noPvText (выключить), pvSize / pvTextSize (размер в %).

import { state }                                    from "./state.js";
import { TRADERS }                                  from "./constants.js";
import { mapEl, isMobile, parseMarkerSize,
         normalizeImageUrl }                        from "./ui.js";

const BASE_IMG_W = 300, BASE_IMG_H = 180, BASE_FONT = 11;
let card = null, active = null;

function ensureCard() {
  if (!card) {
    card = document.createElement("div");
    card.id = "hoverCard";
    document.body.appendChild(card);
  }
  return card;
}

export function hideHover() {
  active = null;
  if (card) { card.classList.remove("show"); card.innerHTML = ""; }
}

function position() {
  if (!card || !active) return;
  if (!active.isConnected) { hideHover(); return; }
  const icon = active.querySelector(".marker-icon") || active;
  const r  = icon.getBoundingClientRect();
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const vw = window.innerWidth;
  let left = r.left + r.width / 2 - cw / 2;
  left = Math.max(8, Math.min(left, vw - cw - 8));
  let top = r.top - ch - 10;                       // над маркером
  if (top < 8) top = Math.min(r.bottom + 10, window.innerHeight - ch - 8);   // не хватает места — под маркером
  card.style.left = Math.round(left) + "px";
  card.style.top  = Math.round(Math.max(top, 8)) + "px";
}

function show(el, m) {
  const wantImg  = !!m.imgUrl && !m.noPvImg;
  const wantText = !m.noPvText && !!(m.name || TRADERS[m.trader]);
  if (!wantImg && !wantText) { hideHover(); return; }

  const c = ensureCard();
  c.innerHTML = "";

  if (wantImg) {
    const k = (parseMarkerSize(m.pvSize) || 100) / 100;
    const box = document.createElement("div");
    box.className = "hc-img";
    box.style.width  = Math.round(BASE_IMG_W * k) + "px";
    box.style.height = Math.round(BASE_IMG_H * k) + "px";
    const img = document.createElement("img");
    img.alt = ""; img.draggable = false;
    img.src = normalizeImageUrl(m.imgUrl);
    box.appendChild(img);
    c.appendChild(box);
  }

  if (wantText) {
    const k = (parseMarkerSize(m.pvTextSize) || 100) / 100;
    const t = document.createElement("div");
    t.className = "hc-text";
    t.style.fontSize = (BASE_FONT * k).toFixed(1) + "px";
    t.appendChild(document.createTextNode(m.name || ""));
    const tr = TRADERS[m.trader]?.label;
    if (tr) { const s = document.createElement("small"); s.textContent = tr; t.appendChild(s); }
    c.appendChild(t);
  }

  active = el;
  c.classList.add("show");
  position();
}

/* Вешается на каждый маркер при создании (на сенсорных экранах подсказки нет) */
export function attachHover(el, m) {
  if (isMobile()) return;
  el.addEventListener("mouseenter", () => show(el, m));
  el.addEventListener("mouseleave", hideHover);
}

/* Подсказка следует за маркером при зуме/сдвиге карты и скрывается, если маркер ушёл из-под курсора */
mapEl.addEventListener("panzoomstart",  hideHover);
mapEl.addEventListener("panzoomchange", () => {
  if (active && !active.matches(":hover")) hideHover(); else position();
});
window.addEventListener("resize", position);

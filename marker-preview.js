// marker-preview.js — Автосмещение превью и тултипа у краёв экрана

/* Отступ от края viewport в пикселях */
const EDGE_GAP    = 8;
const PREVIEW_W   = 300;
const TOOLTIP_W   = 180;

/* ── Вычислить горизонтальный сдвиг чтобы не вылезать за край ── */
function clampShift(centerX, width) {
  const half  = width / 2;
  const left  = centerX - half;
  const right = centerX + half;
  const vw    = window.innerWidth;

  if (left  < EDGE_GAP)        return EDGE_GAP - left;
  if (right > vw - EDGE_GAP)   return (vw - EDGE_GAP) - right;
  return 0;
}

document.addEventListener("mouseover", e => {
  const marker = e.target.closest(".marker");
  if (!marker) return;

  const rect   = marker.getBoundingClientRect();
  const center = rect.left + rect.width / 2;

  /* ── Превью ── */
  const preview = marker.querySelector(".marker-preview");
  if (preview) {
    const shift = clampShift(center, PREVIEW_W);
    preview.style.left      = `calc(50% + ${shift}px)`;
    preview.style.transform = "translateX(-50%) translateY(0)";
  }

  /* ── Тултип ── */
  const tooltip = marker.querySelector(".marker-tooltip");
  if (tooltip) {
    const shift = clampShift(center, TOOLTIP_W);
    tooltip.style.transform = `translateX(calc(-50% + ${shift}px)) translateY(2px)`;
  }
});

document.addEventListener("mouseout", e => {
  const marker = e.target.closest(".marker");
  if (!marker) return;

  const preview = marker.querySelector(".marker-preview");
  const tooltip = marker.querySelector(".marker-tooltip");
  if (preview) { preview.style.left = ""; preview.style.transform = ""; }
  if (tooltip) { tooltip.style.transform = ""; }
});

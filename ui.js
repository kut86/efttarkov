// ui.js — DOM-элементы и вспомогательные функции

/* ── DOM ── */
export const mapEl          = document.getElementById("map");
export const mapImg         = document.getElementById("mapImage");
export const adminBadge     = document.getElementById("adminBadge");
export const addModeBtn     = document.getElementById("addModeBtn");
export const filterSel      = document.getElementById("filter");
export const searchInput    = document.getElementById("markerSearch");
export const mapSelect      = document.getElementById("mapSelect");
export const mapWrapper     = document.getElementById("mapWrapper");
export const addForm        = document.getElementById("addForm");
export const addName        = document.getElementById("addName");
export const addType        = document.getElementById("addType");
export const addTrader      = document.getElementById("addTrader");
export const editTrader     = document.getElementById("editTrader");
export const traderFilter   = document.getElementById("traderFilter");
export const modalTrader    = document.getElementById("modalTrader");
export const addImgUrl      = document.getElementById("addImgUrl");
export const addIconUrl     = document.getElementById("addIconUrl");
export const addEmojiInput  = document.getElementById("addEmojiInput");
export const addEmojiPicker = document.getElementById("addEmojiPicker");
export const addExtraFields = document.getElementById("addExtraFields");
export const addConfirm     = document.getElementById("addConfirm");
export const addCancel      = document.getElementById("addCancel");
export const modal          = document.getElementById("modal");
export const modalTitle     = document.getElementById("modalTitle");
export const modalBadge     = document.getElementById("modalBadge");
export const modalPhoto     = document.getElementById("modalPhoto");
export const modalDesc      = document.getElementById("modalDesc");
export const modalExtras    = document.getElementById("modalExtras");
export const modalLinks     = document.getElementById("modalLinks");
export const modalVideos    = document.getElementById("modalVideos");
export const addVideos      = document.getElementById("addVideos");
export const editVideos     = document.getElementById("editVideos");
export const addMarkerLinks = document.getElementById("addMarkerLinks");
export const editMarkerLinks= document.getElementById("editMarkerLinks");
export const editForm       = document.getElementById("editForm");
export const editName       = document.getElementById("editName");
export const editType       = document.getElementById("editType");
export const editImgUrl     = document.getElementById("editImgUrl");
export const editIconUrl    = document.getElementById("editIconUrl");
export const editEmojiInput = document.getElementById("editEmojiInput");
export const editEmojiPicker= document.getElementById("editEmojiPicker");
export const editExtraFields= document.getElementById("editExtraFields");
export const saveBtn        = document.getElementById("saveBtn");
export const cancelEdit     = document.getElementById("cancelEdit");
export const editBtn        = document.getElementById("editBtn");
export const delBtn         = document.getElementById("delBtn");
export const modalClose     = document.getElementById("modalClose");
export const levelUp        = document.getElementById("levelUp");
export const levelDown      = document.getElementById("levelDown");
export const levelLabel     = document.getElementById("levelLabel");
export const levelControls  = document.getElementById("levelControls");

/* ── Вспомогательные функции ── */
export function isMobile() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

export function toast(msg, err = false) {
  const tc = document.getElementById("toastContainer");
  const t  = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Ссылки на маркеры: #map=woods&level=0&marker=ID ── */
export function parseHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ""));
  return {
    map:    p.get("map"),
    level:  p.get("level"),
    marker: p.get("marker"),
  };
}

export function buildHash({ map, level, marker }) {
  const p = new URLSearchParams();
  if (map)    p.set("map", map);
  if (level !== undefined && level !== null) p.set("level", String(level));
  if (marker) p.set("marker", marker);
  return "#" + p.toString();
}

/* ── Очистка HTML описания (защита от XSS) ── */
let purifyReady = false;
export function sanitizeHTML(html) {
  const P = window.DOMPurify;
  if (!P) {
    // DOMPurify не загрузился — показываем только текст, без разметки
    const t = document.createElement("template");
    t.innerHTML = html;
    return esc(t.content.textContent);
  }
  if (!purifyReady) {
    purifyReady = true;
    P.addHook("afterSanitizeAttributes", node => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
      if (node.tagName === "IFRAME") {
        const src = node.getAttribute("src") || "";
        if (!/^https:\/\/(www\.youtube(-nocookie)?\.com|player\.vimeo\.com)\//.test(src)) {
          node.parentNode && node.parentNode.removeChild(node);
        }
      }
    });
  }
  return P.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "target"],
  });
}

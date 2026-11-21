// videos.js — Поле «Видео»: разбор ссылок, редактор строк и плеер в окне метки
// Хранится как [{ url, title }]. Поддержка: YouTube (в т.ч. Shorts), Vimeo, прямые mp4/webm.

/* ── Разбор ссылки ── */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function ytStart(u) {
  const t = u.searchParams.get("t") || u.searchParams.get("start");
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

export function parseVideo(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;

  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  const path = u.pathname;

  /* YouTube */
  let id = null, vertical = false;
  if (host === "youtu.be") id = path.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (path === "/watch") id = u.searchParams.get("v");
    else {
      const m = path.match(/^\/(shorts|embed|live|v)\/([^/?]+)/);
      if (m) { id = m[2]; vertical = m[1] === "shorts"; }
    }
  }
  if (id && YT_ID.test(id)) {
    const start = ytStart(u);
    return {
      kind: "youtube", site: "YouTube", vertical,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${start ? `&start=${start}` : ""}`,
      watch: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`,
    };
  }

  /* Vimeo */
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/\/(\d{6,})(?:\/|$)/);
    if (m) return {
      kind: "vimeo", site: "Vimeo", vertical: false, thumb: "",
      embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1`,
      watch: `https://vimeo.com/${m[1]}`,
    };
  }

  /* Прямой файл */
  if (/\.(mp4|webm|ogv|mov|m4v)$/i.test(path)) {
    return { kind: "file", site: "Видео", vertical: false, src: u.href, watch: u.href };
  }
  return null;
}

/* ── Редактор: строки «ссылка + подпись» ── */
export function addVideoRow(container, v = null) {
  const row = document.createElement("div");
  row.className = "vd-row";
  row.innerHTML = `
    <input type="url" class="vd-url" inputmode="url" autocomplete="off"
           placeholder="Ссылка: YouTube, Shorts, Vimeo или .mp4">
    <div class="vd-pick">
      <input type="text" class="vd-title" maxlength="120" placeholder="Подпись (необязательно)">
      <button type="button" class="vd-remove btn btn-sm btn-danger" aria-label="Удалить">✕</button>
    </div>`;
  const url = row.querySelector(".vd-url");
  url.value = v?.url || "";
  row.querySelector(".vd-title").value = v?.title || "";
  row.querySelector(".vd-remove").onclick = () => row.remove();
  url.addEventListener("input", () => {
    row.classList.toggle("vd-bad", !!url.value.trim() && !parseVideo(url.value));
  });
  container.appendChild(row);
}

/* Возвращает список; в list.invalid — сколько ссылок не удалось распознать */
export function collectVideos(container) {
  const list = [];
  let invalid = 0;
  container.querySelectorAll(".vd-row").forEach(row => {
    const url = row.querySelector(".vd-url").value.trim();
    if (!url) return;
    if (!parseVideo(url)) { invalid++; row.classList.add("vd-bad"); return; }
    list.push({ url, title: row.querySelector(".vd-title").value.trim() });
  });
  list.invalid = invalid;
  return list;
}

/* ── Плеер в окне метки ── */
function goFullscreen(box) {
  const video = box.querySelector("video");
  const el = video || box;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (fn) {
    const p = fn.call(el);
    if (p && p.catch) p.catch(() => {});
    return true;
  }
  if (video && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return true; }
  return false;
}

function buildPlayer(v) {
  const info = parseVideo(v.url);
  if (!info) return null;

  const card = document.createElement("div");
  card.className = "video-card";
  if (v.title) {
    const t = document.createElement("div");
    t.className = "video-title";
    t.textContent = v.title;
    card.appendChild(t);
  }

  const box = document.createElement("div");
  box.className = "video-box" + (info.vertical ? " vertical" : "");
  card.appendChild(box);

  let started = false;
  const start = () => {
    if (started) return;
    if (navigator.onLine === false && info.kind !== "file") {
      const msg = box.querySelector(".video-offline");
      if (msg) msg.hidden = false;
      return;
    }
    started = true;
    const f = document.createElement("iframe");
    f.src = info.embed;
    f.title = v.title || "Видео";
    f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    f.allowFullscreen = true;
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    box.replaceChildren(f);
  };

  if (info.kind === "file") {
    const el = document.createElement("video");
    el.src = info.src;
    el.controls = true;
    el.playsInline = true;
    el.preload = "metadata";
    box.appendChild(el);
    started = true;
  } else {
    const poster = document.createElement("button");
    poster.type = "button";
    poster.className = "video-poster";
    poster.setAttribute("aria-label", "Смотреть: " + (v.title || info.site));
    if (info.thumb) {
      const img = document.createElement("img");
      img.src = info.thumb;
      img.alt = "";
      img.loading = "lazy";
      img.draggable = false;
      img.addEventListener("error", () => img.remove(), { once: true });
      poster.appendChild(img);
    }
    const play = document.createElement("span");
    play.className = "video-play";
    play.textContent = "▶";
    poster.appendChild(play);
    const off = document.createElement("span");
    off.className = "video-offline";
    off.hidden = true;
    off.textContent = "Видео доступно только с интернетом";
    poster.appendChild(off);
    poster.onclick = start;
    box.appendChild(poster);
  }

  /* Кнопки под плеером */
  const bar = document.createElement("div");
  bar.className = "video-bar";

  const fs = document.createElement("button");
  fs.type = "button";
  fs.className = "video-btn";
  fs.textContent = "⛶ На весь экран";
  fs.onclick = () => {
    start();
    if (!goFullscreen(box)) window.open(info.watch, "_blank", "noopener");
  };
  bar.appendChild(fs);

  const ext = document.createElement("a");
  ext.className = "video-btn";
  ext.href = info.watch;
  ext.target = "_blank";
  ext.rel = "noopener noreferrer";
  ext.textContent = "↗ " + info.site;
  bar.appendChild(ext);

  card.appendChild(bar);
  return card;
}

export function renderVideos(container, videos) {
  stopVideos(container);
  const cards = (videos || []).map(buildPlayer).filter(Boolean);
  container.style.display = cards.length ? "" : "none";
  cards.forEach(c => container.appendChild(c));
}

/* Останавливает воспроизведение (убирает плееры) и выходит из полноэкранного режима */
export function stopVideos(container) {
  container.innerHTML = "";
  try {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  } catch { /* ignore */ }
}

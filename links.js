// links.js — «Маркеры-ссылки»: поля в редакторе и сбор данных
// Ссылка хранится как { text, map, id, name, level }

import { db, ref, get } from "./config.js";
import { MAPS }         from "./constants.js";

let catalogPromise = null;

/* Сбросить кеш списка меток (после добавления/удаления/открытия формы) */
export function invalidateCatalog() { catalogPromise = null; }

/* Список всех меток всех карт — одним запросом */
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = get(ref(db, "maps")).then(snap => {
      const all  = snap.val() || {};
      const list = [];
      Object.keys(MAPS).forEach(mapId => {
        const items = Object.entries(all[mapId]?.markers || {}).map(([id, m]) => ({
          map: mapId, id, name: m.name || "Без названия", level: m.level ?? 0
        }));
        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        list.push(...items);
      });
      return list;
    }).catch(err => { catalogPromise = null; throw err; });
  }
  return catalogPromise;
}

function levelLabel(mapId, level) {
  const levels = MAPS[mapId]?.levels || {};
  return Object.keys(levels).length > 1 ? (levels[String(level)]?.label || "") : "";
}

function makeOption(item) {
  const lvl = levelLabel(item.map, item.level);
  const o = new Option(lvl ? `${item.name} · ${lvl}` : item.name, `${item.map}|${item.id}`);
  o.dataset.name  = item.name;
  o.dataset.level = String(item.level ?? 0);
  return o;
}

function fillSelect(sel, list, link, selfId) {
  sel.innerHTML = "";
  sel.add(new Option("— выберите маркер —", ""));
  Object.keys(MAPS).forEach(mapId => {
    const items = list.filter(x => x.map === mapId && x.id !== selfId);
    if (!items.length) return;
    const group = document.createElement("optgroup");
    group.label = MAPS[mapId].label || mapId;
    items.forEach(x => group.appendChild(makeOption(x)));
    sel.appendChild(group);
  });
  if (link) {
    const val = `${link.map}|${link.id}`;
    if (![...sel.options].some(o => o.value === val)) {
      const o = new Option(`⚠ ${link.name || "Метка"} (не найдена)`, val);
      o.dataset.name  = link.name || "";
      o.dataset.level = String(link.level ?? 0);
      sel.add(o);
    }
    sel.value = val;
  }
}

/* Добавить строку «текст + маркер» в контейнер редактора */
export function addMarkerLinkRow(container, link = null, selfId = null) {
  const row = document.createElement("div");
  row.className = "ml-row";
  row.innerHTML = `
    <input type="text" class="ml-text" maxlength="200"
           placeholder="Текст для игрока, например: Сначала возьми ключ в">
    <div class="ml-pick">
      <select class="ml-select"><option value="">Загрузка меток…</option></select>
      <button type="button" class="ml-remove btn btn-sm btn-danger" aria-label="Удалить">✕</button>
    </div>`;
  row.querySelector(".ml-text").value = link?.text || "";
  row.querySelector(".ml-remove").onclick = () => row.remove();
  container.appendChild(row);

  const sel = row.querySelector(".ml-select");
  if (link) {
    /* сразу показываем сохранённый выбор — чтобы он не потерялся, если список ещё грузится */
    sel.innerHTML = "";
    const o = new Option(link.name || "Метка", `${link.map}|${link.id}`);
    o.dataset.name  = link.name || "";
    o.dataset.level = String(link.level ?? 0);
    sel.add(o);
    sel.value = o.value;
  }
  loadCatalog()
    .then(list => fillSelect(sel, list, link, selfId))
    .catch(() => {
      if (!link) sel.innerHTML = '<option value="">Не удалось загрузить список меток</option>';
    });
}

/* Собрать ссылки из редактора (строки без выбранного маркера пропускаются) */
export function collectMarkerLinks(container) {
  const result = [];
  container.querySelectorAll(".ml-row").forEach(row => {
    const sel = row.querySelector(".ml-select");
    if (!sel.value) return;
    const [map, id] = sel.value.split("|");
    const opt = sel.selectedOptions[0];
    result.push({
      text:  row.querySelector(".ml-text").value.trim(),
      map, id,
      name:  opt.dataset.name || "Метка",
      level: Number(opt.dataset.level) || 0,
    });
  });
  return result;
}

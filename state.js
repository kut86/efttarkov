// state.js — Глобальное изменяемое состояние приложения

/**
 * Единственный объект состояния. Мутируется напрямую — модули
 * читают и пишут в него через именованный импорт { state }.
 */
export const state = {
  /* ── Авторизация ── */
  isAdmin:       false,
  /** Числовой уровень доступа текущего пользователя (0–4) */
  usersAccess:    0,

  /* ── Текущая карта и этаж ── */
  currentMap:    "groundzero",
  currentLevel:  0,
  /** Этаж, на который нужно переключиться после инициализации карты (URL-хэш) */
  _pendingLevel: null,

  /* ── Открытый маркер ── */
  current:       null,   // { id, ...markerData }

  /* ── Режим добавления ── */
  addMode:       false,
  pendingPos:    null,   // { x, y } в процентах

  /* ── Маркеры текущей карты ── */
  allMarkers:    {},     // { [firebaseKey]: markerData }

  /* ── Firebase ── */
  currentRef:    null,   // DatabaseReference текущей карты
  offFn:         null,   // функция отписки от onValue маркеров

  /* ── Panzoom ── */
  pz:            null,

  /* ── Quill-редакторы ── */
  addQuill:      null,
  editQuill:     null,
};

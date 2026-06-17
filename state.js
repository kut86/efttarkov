// state.js — Глобальное изменяемое состояние приложения

export const state = {
  // Авторизация
  isAdmin:      false,

  // Текущая карта и уровень
  currentMap:   "groundzero",
  currentLevel: 0,

  // Открытый маркер в модальном окне
  current:      null,

  // Режим добавления маркера
  addMode:      false,
  pendingPos:   null,

  // Все маркеры текущей карты { id: data }
  allMarkers:   {},

  // Firebase ref текущей карты
  currentRef:   null,

  // Функция отписки от Firebase onValue
  offFn:        null,

  // Экземпляр Panzoom
  pz:           null,

  // Экземпляры Quill-редакторов
  addQuill:     null,
  editQuill:    null,
};
// state.js — Глобальное изменяемое состояние приложения

export const state = {
  // Авторизация (по умолчанию — гость, только просмотр)
  user:         null,
  isAdmin:      false,

  // Текущая карта и уровень
  currentMap:   "groundzero",
  currentLevel: 0,

  // Открытый маркер в модальном окне
  current:      null,

  // Режим добавления маркера
  addMode:      false,
  pendingPos:   null,

  // Маркеры текущей карты { id: data }
  allMarkers:   {},
  dataLoaded:   false,

  // Firebase
  currentRef:   null,
  offFn:        null,

  // Panzoom и состояние вида
  pz:           null,
  fitScale:     1,
  fitted:       false,   // первичное вписывание карты выполнено
  touched:      false,   // пользователь двигал/масштабировал карту
  loadToken:    0,       // защита от гонок при смене карты/этажа

  // Маркер из ссылки, который нужно открыть { id, level }
  pending:      null,
  onData:       null,    // колбэк «маркеры загружены» (ставится в map.js)
  goToMarker:   null,
  enterHouse:   null,    // вход в дом (ставится в map.js)
  houseStack:   [],      // откуда вошли в дом: [{ map, level, marker }]    // переход по маркеру-ссылке (ставится в map.js)

  // Quill-редакторы
  addQuill:     null,
  editQuill:    null,
};

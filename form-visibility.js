// form-visibility.js — Синхронизация видимости кнопок с формой редактирования

(function () {
  const editForm  = document.getElementById("editForm");
  const saveBtn   = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelEdit");

  if (!editForm || !saveBtn || !cancelBtn) {
    console.warn("form-visibility.js: не найдены editForm, saveBtn или cancelEdit");
    return;
  }

  /* Синхронизируем кнопки с текущим состоянием формы при загрузке */
  function syncButtons() {
    const visible = editForm.classList.contains("active");
    saveBtn.style.display   = visible ? "" : "none";
    cancelBtn.style.display = visible ? "" : "none";
  }

  /* Наблюдаем за classList — modal.js переключает класс "active" */
  const obs = new MutationObserver(syncButtons);
  obs.observe(editForm, {
    attributes:     true,
    attributeFilter: ["class"],
  });

  /* Начальная синхронизация */
  syncButtons();
})();

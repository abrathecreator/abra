/* Причины, по которым нижняя панель скрыта: открыта шторка, открыта
   модалка, фокус в текстовом поле (выехала клавиатура). Отдельный
   модуль — чтобы nav.js и contact-modal.js не импортировали друг друга.
   Скрытие синхронное (класс → visibility:hidden): сразу после снятия
   последней причины элемент панели снова может получить фокус. */
const reasons = new Set();

export function setTabbarSuppressed(reason, on) {
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  const tabbar = document.querySelector(".tabbar");
  if (tabbar) tabbar.classList.toggle("is-suppressed", reasons.size > 0);
}

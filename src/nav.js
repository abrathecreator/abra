/* NAV — общий модуль шапки и нижней панели, вызывается из всех entry
   (main.js, article.js, legal.js, unit-economics.js). К анимациям GSAP
   отношения не имеет — работает в обеих ветках reducedMotion.

   Меню «Написать» (десктоп): раскрывает телефон и почту. Escape
   закрывает и возвращает фокус на кнопку, клик снаружи тоже закрывает —
   тот же паттерн, что у contact-modal.js и подсказок «?» в калькуляторе.

   Нижняя панель (≤720px): прячется при прокрутке вниз, возвращается при
   прокрутке вверх и у конца страницы. При prefers-reduced-motion не
   прячется совсем. Пока фокус в текстовом поле — скрыта, чтобы не висеть
   над клавиатурой. */
import { setTabbarSuppressed } from "./tabbar-state.js";

export function initNav() {
  const contactToggle = document.querySelector(".nav__contact .nav__cta");
  const contactMenu = document.getElementById("nav-contact-menu");
  if (contactToggle && contactMenu) initContactMenu(contactToggle, contactMenu);

  const tabbar = document.querySelector(".tabbar");
  if (tabbar) initTabbar(tabbar);
}

function initContactMenu(toggle, menu) {
  const close = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    if (menu.hidden) {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    } else {
      close();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".nav__contact")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      close();
      toggle.focus();
    }
  });
}

function initTabbar(tabbar) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
      const hide = !reduce.matches && y > lastY && y > 90 && !atEnd;
      tabbar.classList.toggle("is-hidden", hide);
      lastY = y;
    },
    { passive: true }
  );

  /* Клавиатуру вызывают только текстовые поля — чекбоксы и кнопки нет. */
  const isTextField = (el) =>
    el instanceof Element &&
    el.matches(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select'
    );
  document.addEventListener("focusin", (e) => {
    if (isTextField(e.target)) setTabbarSuppressed("field", true);
  });
  document.addEventListener("focusout", (e) => {
    if (isTextField(e.target)) setTabbarSuppressed("field", false);
  });
}

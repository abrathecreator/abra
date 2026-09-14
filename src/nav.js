/* NAV — общий модуль для шапки на всех страницах (раньше жила только в
   main.js, потому что раньше только на главной была шапка). Здесь —
   единственная интерактивная часть шапки: кнопка «Написать» раскрывает
   телефон и почту вместо перехода. Escape закрывает и возвращает фокус
   на кнопку, клик снаружи тоже закрывает — тот же паттерн, что у
   contact-modal.js и подсказок «?» в калькуляторе юнит-экономики. Не
   связано с движением, нужно в обеих ветках reducedMotion. */
export function initNav() {
  const navContactToggle = document.querySelector(".nav__contact .nav__cta");
  const navContactMenu = document.getElementById("nav-contact-menu");
  if (!navContactToggle || !navContactMenu) return;

  const closeNavContactMenu = () => {
    navContactMenu.hidden = true;
    navContactToggle.setAttribute("aria-expanded", "false");
  };
  navContactToggle.addEventListener("click", () => {
    if (navContactMenu.hidden) {
      navContactMenu.hidden = false;
      navContactToggle.setAttribute("aria-expanded", "true");
    } else {
      closeNavContactMenu();
    }
  });
  document.addEventListener("click", (e) => {
    if (!navContactMenu.hidden && !e.target.closest(".nav__contact")) {
      closeNavContactMenu();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !navContactMenu.hidden) {
      closeNavContactMenu();
      navContactToggle.focus();
    }
  });
}

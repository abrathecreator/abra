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
  /* MOBILE MENU (≤720px) — гамбургер раскрывает .nav__links как панель
     под шапкой вместо горизонтального ряда (см. style.css). Тот же
     паттерн Escape/клик-снаружи/возврат фокуса, что у меню «Написать»
     выше, плюс закрытие по клику на саму ссылку — иначе на главной
     клик по якорю (#insight и т.п.) не увёл бы фокус пользователя от
     раскрытой панели. */
  const menuToggle = document.querySelector(".nav__menu-toggle");
  const navLinks = document.querySelector(".nav__links");

  /* Обе панели закрывают друг друга при открытии — иначе на узких
     экранах они занимают одну и ту же полосу и накладываются. */
  const closeNavContactMenu = () => {
    if (!navContactMenu || navContactMenu.hidden) return;
    navContactMenu.hidden = true;
    navContactToggle.setAttribute("aria-expanded", "false");
  };
  const closeMobileMenu = () => {
    if (!navLinks || !navLinks.classList.contains("is-open")) return;
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  if (navContactToggle && navContactMenu) {
    navContactToggle.addEventListener("click", () => {
      if (navContactMenu.hidden) {
        closeMobileMenu();
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

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      if (isOpen) {
        closeNavContactMenu();
      }
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });
    document.addEventListener("click", (e) => {
      if (
        navLinks.classList.contains("is-open") &&
        !e.target.closest(".nav")
      ) {
        closeMobileMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
        closeMobileMenu();
        menuToggle.focus();
      }
    });
  }
}

/* NAV — общий модуль шапки и нижней панели, вызывается из всех entry
   (main.js, article.js, legal.js, unit-economics.js). К анимациям GSAP
   отношения не имеет — работает в обеих ветках reducedMotion.

   Меню «Написать» (десктоп): раскрывает телефон и почту. Escape
   закрывает и возвращает фокус на кнопку, клик снаружи тоже закрывает —
   тот же паттерн, что у contact-modal.js и подсказок «?» в калькуляторе.

   Нижняя панель (≤720px): прячется при прокрутке вниз, возвращается при
   прокрутке вверх и у конца страницы. При prefers-reduced-motion не
   прячется совсем. Если в спрятанную панель пришёл фокус с клавиатуры,
   её показывает CSS (.tabbar.is-hidden:focus-within). Пока фокус в
   текстовом поле — скрыта, чтобы не висеть над клавиатурой.

   Шторка закрывается сразу, без анимации и возврата фокуса, когда экран
   становится шире 720px (поворот) и когда страница вернулась из bfcache. */
import { openContactModal } from "./contact-modal.js";
import { setTabbarSuppressed } from "./tabbar-state.js";

export function initNav() {
  const contactToggle = document.querySelector(".nav__contact .nav__cta");
  const contactMenu = document.getElementById("nav-contact-menu");
  if (contactToggle && contactMenu) initContactMenu(contactToggle, contactMenu);

  const tabbar = document.querySelector(".tabbar");
  if (tabbar) initTabbar(tabbar);

  const sheet = document.getElementById("contact-sheet");
  const sheetOpener = document.querySelector("[data-sheet-open]");
  if (sheet && sheetOpener) initSheet(sheet, sheetOpener);
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
      /* Конец страницы проверяется до порога в 6px: последний сдвиг до
         самого низа бывает короче, и панель осталась бы спрятанной. */
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
      if (atEnd) {
        tabbar.classList.remove("is-hidden");
        lastY = y;
        return;
      }
      if (Math.abs(y - lastY) < 6) return;
      const hide = !reduce.matches && y > lastY && y > 90;
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

/* ШТОРКА «Написать» (≤720px) — открывается кнопкой нижней панели вместо
   перехода по её href (без JS href ведёт на форму главной). Фокус при
   открытии — на саму панель шторки, чтобы скринридер прочитал заголовок;
   Tab ходит по кругу; Escape, затемнение и «Закрыть» закрывают и
   возвращают фокус на «Написать». «Оставить заявку» на страницах с
   модалкой закрывает шторку и открывает модалку, фокус после неё — тоже
   на «Написать». */
function initSheet(sheet, opener) {
  const panel = sheet.querySelector(".sheet__panel");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let closeTimer = null;

  const focusables = () =>
    Array.from(panel.querySelectorAll("a[href], button:not([disabled])")).filter(
      (el) => el.offsetParent !== null
    );

  const open = () => {
    clearTimeout(closeTimer);
    sheet.hidden = false;
    setTabbarSuppressed("sheet", true);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    panel.focus();
  };

  /* instant — закрыть без анимации: при повороте шире 720px и при
     восстановлении страницы из bfcache ждать 300мс незачем. */
  const close = ({ returnFocus = true, instant = false } = {}) => {
    clearTimeout(closeTimer);
    sheet.classList.remove("is-open");
    document.body.style.overflow = "";
    const finish = () => {
      sheet.hidden = true;
      /* Сначала показать панель, потом вернуть фокус — см. tabbar-state.js. */
      setTabbarSuppressed("sheet", false);
      if (returnFocus) opener.focus();
    };
    if (instant || reduce.matches) finish();
    else closeTimer = setTimeout(finish, 300);
  };

  /* Поворот телефона: шире 720px нижней панели нет, «Написать» в ней
     display:none — шторка закрывается сразу, фокус на скрытую кнопку
     не возвращается (он туда и не встанет). */
  const phone = window.matchMedia("(max-width: 720px)");
  phone.addEventListener("change", (e) => {
    if (!e.matches && !sheet.hidden) close({ returnFocus: false, instant: true });
  });

  /* Назад из bfcache: на страницах без модалки «Оставить заявку» — ссылка,
     и страница возвращается с открытой шторкой и заблокированной прокруткой. */
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !sheet.hidden) close({ returnFocus: false, instant: true });
  });

  opener.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  sheet.querySelectorAll("[data-sheet-close]").forEach((el) => {
    el.addEventListener("click", () => close());
  });

  const apply = sheet.querySelector("[data-sheet-apply]");
  if (apply) {
    apply.addEventListener("click", () => {
      close({ returnFocus: false });
      openContactModal(opener);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (sheet.hidden) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

import "./style.css";
import "./metrica.js";
import "./cookie-consent.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initContactModal } from "./contact-modal.js";
import { initNav } from "./nav.js";

gsap.registerPlugin(ScrollTrigger);

initContactModal();
initNav();

/* Тот же принцип, что в main.js: при prefers-reduced-motion не создаём ни
   одного твина, чтобы ни один блок не получил opacity:0 из JS — контент
   остаётся видимым в состоянии из CSS. */
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (!reducedMotion) {
  gsap.utils.toArray(".case__section").forEach((section) => {
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
      },
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  });
}

/* TOC SCROLL-SPY — подсвечивает текущий блок в оглавлении сайдбара.
   Это состояние, а не декоративная анимация (перехода нет, только
   какая ссылка сейчас активна), поэтому работает в обеих ветках
   reducedMotion — так же, как updateFunnelArrows()/отправка формы
   в main.js. */
const tocLinks = new Map(
  Array.from(document.querySelectorAll(".case__toc-link")).map((link) => [
    link.getAttribute("href").slice(1),
    link,
  ])
);

if (tocLinks.size) {
  const sections = document.querySelectorAll(".case__section[id]");
  /* Наблюдатель сообщает только те секции, чьё пересечение поменялось за
     этот кадр, а не все текущие — поэтому храним собственное множество
     пересекающих и на каждый колбэк пересчитываем активную секцию по
     нему целиком, а не по entries. Активна верхняя из пересекающих
     (ближайшая к верху полосы засчёта), а не последняя сработавшая —
     иначе при обратном скролле подсвечивался экран, который уже почти
     ушёл вверх. Пустое множество (ушли выше первой секции) — подсветка
     снимается совсем. */
  const intersecting = new Set();

  const updateActiveLink = () => {
    let activeLink = null;
    if (intersecting.size) {
      const topSection = Array.from(intersecting).sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      )[0];
      activeLink = tocLinks.get(topSection.id) || null;
    }
    tocLinks.forEach((link) => {
      const isActive = link === activeLink;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersecting.add(entry.target);
        } else {
          intersecting.delete(entry.target);
        }
      });
      updateActiveLink();
    },
    { rootMargin: "-25% 0px -60% 0px" }
  );
  sections.forEach((section) => tocObserver.observe(section));
}

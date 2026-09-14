import "./style.css";
import "./metrica.js";
import "./cookie-consent.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initContactModal } from "./contact-modal.js";

gsap.registerPlugin(ScrollTrigger);

initContactModal();

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
  const tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = tocLinks.get(entry.target.id);
        if (!link) return;
        tocLinks.forEach((l) => l.classList.remove("is-active"));
        link.classList.add("is-active");
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((section) => tocObserver.observe(section));
}

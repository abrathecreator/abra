import "./style.css";
import "./metrica.js";
import "./cookie-consent.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

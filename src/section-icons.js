import { SECTION_ICONS } from "./icons.js";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initSectionIcons(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-icon]"));
  if (!nodes.length) return;

  nodes.forEach((node) => {
    const type = node.dataset.icon;
    const markup = SECTION_ICONS[type];
    if (!markup) return;
    node.classList.add("section-icon", `section-icon--${type}`);
    node.innerHTML = markup;
  });

  /* Reduced motion: leave every icon in its static default state.
     No reveal playback, hover/focus states still resolve instantly
     via the transition-duration:0 override in style.css. */
  if (reducedMotion() || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );

  nodes.forEach((node) => observer.observe(node));
}

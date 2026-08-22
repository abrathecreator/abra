import { SECTION_ICONS } from "./icons.js";

/* How long each icon's full interaction sequence takes to resolve —
   used to time the one-shot viewport reveal (see below). Kept in sync
   with the transition/animation durations in style.css. */
const REVEAL_DURATIONS = {
  insight: 760,
  system: 500,
  services: 600,
  method: 820,
  philosophy: 560,
  connect: 700,
  contact: 840,
};

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
        const el = entry.target;
        el.classList.add("is-revealed");
        window.setTimeout(() => {
          el.classList.remove("is-revealed");
        }, REVEAL_DURATIONS[el.dataset.icon] || 700);
        obs.unobserve(el);
      });
    },
    { threshold: 0.3 }
  );

  nodes.forEach((node) => observer.observe(node));
}

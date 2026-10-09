// initOrbCards() — медный шар за курсором внутри карточек .orb-card.
// Стили и смысл — блок «ORB CARD» в style.css.
//
// Проверка «мышь есть, движение не отключено» идёт в момент наведения,
// а не один раз при загрузке: к планшету могут подключить мышь,
// настройку движения в ОС — поменять, не перезагружая страницу.

const canHover = matchMedia("(hover: hover) and (pointer: fine)");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

// Доля пути до курсора, которую шар проходит за кадр: меньше — ленивее.
const EASE = 0.12;

export function initOrbCards() {
  document.querySelectorAll(".orb-card").forEach(initOrbCard);
}

function initOrbCard(el) {
  // t — где курсор, p — где шар; шар догоняет курсор по кадрам
  let tx = 0, ty = 0, px = 0, py = 0, raf = 0;

  const place = () => {
    el.style.setProperty("--ox", `${px}px`);
    el.style.setProperty("--oy", `${py}px`);
  };

  const tick = () => {
    px += (tx - px) * EASE;
    py += (ty - py) * EASE;
    place();
    raf = Math.abs(tx - px) + Math.abs(ty - py) > 0.5 ? requestAnimationFrame(tick) : 0;
  };

  el.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" || !canHover.matches || reduced.matches) return;
    const r = el.getBoundingClientRect();
    tx = px = e.clientX - r.left;
    ty = py = e.clientY - r.top;
    place();
    el.classList.add("is-lit");
  });

  el.addEventListener("pointermove", (e) => {
    if (!el.classList.contains("is-lit")) return;
    const r = el.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  el.addEventListener("pointerleave", () => el.classList.remove("is-lit"));
}

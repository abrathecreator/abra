import "./style.css";
import "./metrica.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initHero } from "./hero.js";
import { initSectionIcons } from "./section-icons.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("hero-canvas");
initHero(canvas);
initSectionIcons();

/* HERO INTRO */
const heroIntroSelectors = [
  ".nav",
  ".hero__eyebrow",
  ".hero__title .line",
  ".hero__subtitle",
  ".hero__sub",
  ".hero__actions .abra-link",
  ".hero__actions .abra-cta",
  ".hero__scroll",
];

try {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(".nav", { y: -20, opacity: 0, duration: 0.8 }, 0.1)
    .from(".hero__eyebrow", { y: 20, opacity: 0, duration: 0.7 }, 0.3)
    .from(
      ".hero__title .line",
      { y: 80, opacity: 0, duration: 1, stagger: 0.08 },
      0.45
    )
    .from(".hero__subtitle", { y: 30, opacity: 0, duration: 0.8 }, 0.8)
    .from(".hero__sub", { y: 20, opacity: 0, duration: 0.7 }, 1.05)
    .from(
      ".hero__actions .abra-link, .hero__actions .abra-cta",
      { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 },
      1.2
    )
    .from(".hero__scroll", { opacity: 0, duration: 0.8 }, 1.5);
} catch (err) {
  heroIntroSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  });
}

/* Safety net: if the intro timeline stalls or errors for any reason
   (slow asset load, browser quirk), never leave hero text stuck at
   opacity:0 — force it visible after a short grace period. */
setTimeout(() => {
  heroIntroSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (getComputedStyle(el).opacity === "0") {
        el.style.opacity = "1";
        el.style.transform = "none";
      }
    });
  });
}, 2500);

/* SECTION HEADS */
gsap.utils.toArray(".section__head").forEach((head) => {
  gsap.from(head.children, {
    scrollTrigger: {
      trigger: head,
      start: "top 82%",
    },
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.1,
    ease: "power3.out",
  });
});

/* FUNNEL */
gsap.from(".funnel > *", {
  scrollTrigger: {
    trigger: ".funnel",
    start: "top 85%",
  },
  y: 12,
  opacity: 0,
  duration: 0.5,
  stagger: 0.06,
  ease: "power2.out",
  onComplete: () => updateFunnelArrows(),
});

/* Hide arrows that end up as the first item of a wrapped row */
function updateFunnelArrows() {
  const groups = document.querySelectorAll(".funnel .funnel__group");
  let prevTop = null;
  groups.forEach((group) => {
    const top = group.getBoundingClientRect().top;
    const arrow = group.querySelector(".funnel__arrow");
    if (arrow) {
      const isNewRow = prevTop === null || Math.abs(top - prevTop) > 4;
      arrow.style.display = isNewRow ? "none" : "";
    }
    prevTop = top;
  });
}

updateFunnelArrows();
window.addEventListener("resize", updateFunnelArrows);
window.addEventListener("load", updateFunnelArrows);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => updateFunnelArrows());
}

/* CARDS */
gsap.from(".cards .card", {
  scrollTrigger: {
    trigger: ".cards",
    start: "top 80%",
  },
  y: 20,
  opacity: 0,
  duration: 0.7,
  ease: "power3.out",
});

/* SERVICES */
gsap.from(".services__grid .service", {
  scrollTrigger: {
    trigger: ".services__grid",
    start: "top 80%",
  },
  y: 20,
  opacity: 0,
  duration: 0.8,
  ease: "power3.out",
});

/* METHOD STEPS */
gsap.utils.toArray(".step").forEach((step) => {
  gsap.from(step, {
    scrollTrigger: {
      trigger: step,
      start: "top 85%",
    },
    x: -30,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out",
  });
});

/* PHILOSOPHY */
gsap.from(".philosophy__title", {
  scrollTrigger: {
    trigger: ".philosophy",
    start: "top 70%",
  },
  y: 40,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
});

gsap.from(".philosophy__text", {
  scrollTrigger: {
    trigger: ".philosophy",
    start: "top 65%",
  },
  y: 30,
  opacity: 0,
  duration: 1,
  delay: 0.15,
  ease: "power3.out",
});

gsap.fromTo(
  ".philosophy__mark",
  { scale: 0.9, opacity: 0 },
  {
    scrollTrigger: {
      trigger: ".philosophy",
      start: "top 80%",
      end: "bottom top",
      scrub: 1,
    },
    scale: 1.1,
    opacity: 0.05,
    ease: "none",
  }
);

/* CTA */
gsap.from(".cta__inner > *", {
  scrollTrigger: {
    trigger: ".cta",
    start: "top 80%",
  },
  y: 30,
  opacity: 0,
  duration: 0.8,
  stagger: 0.1,
  ease: "power3.out",
});

/* CONTACT REVEAL */
gsap.from(".contact__inner > *", {
  scrollTrigger: {
    trigger: ".contact",
    start: "top 80%",
  },
  y: 24,
  opacity: 0,
  duration: 0.7,
  stagger: 0.08,
  ease: "power3.out",
});

/* CONTACT FORM SUBMIT (Formspree AJAX) */
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const successEl = document.getElementById("contact-success");
  const errorEl = document.getElementById("contact-error");
  const submitBtn = document.getElementById("contact-submit");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }

    // Explicit guard: consent must be checked even if browser validation is bypassed.
    const consentEl = document.getElementById("cf-consent");
    if (consentEl && !consentEl.checked) {
      if (errorEl) {
        errorEl.textContent =
          "Отметьте согласие на обработку персональных данных.";
        errorEl.hidden = false;
      }
      consentEl.focus();
      return;
    }

    const action = contactForm.getAttribute("action") || "";
    if (action.includes("YOUR_FORMSPREE_ID")) {
      if (errorEl) {
        errorEl.textContent =
          "Форма ещё не подключена. Вставьте свой Formspree ID в action.";
        errorEl.hidden = false;
      }
      return;
    }

    contactForm.classList.add("is-submitting");
    if (submitBtn) submitBtn.dataset.state = "loading";
    try {
      const res = await fetch(action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        contactForm.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data.errors && data.errors.map((x) => x.message).join(", ")) ||
          "Не удалось отправить. Попробуйте ещё раз или напишите на email.";
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.hidden = false;
        }
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent =
          "Сеть недоступна. Попробуйте ещё раз или напишите на email.";
        errorEl.hidden = false;
      }
    } finally {
      contactForm.classList.remove("is-submitting");
      if (submitBtn) delete submitBtn.dataset.state;
    }
  });
}

/* Refresh on load in case fonts change layout */
window.addEventListener("load", () => ScrollTrigger.refresh());

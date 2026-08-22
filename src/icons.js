/* ABRA section-icon system — hand-built SVG, no icon library.
   Shared viewBox "0 0 64 64" so every icon scales identically.
   Classes:
     .icon-base   — static structural geometry (muted, always visible)
     .icon-guide  — secondary direction lines (very faint at rest, draw in on interaction)
     .icon-fill / .icon-stroke — parts that flip from muted to accent on interaction
   Per-icon part classes carry the actual transition/animation rules (see style.css). */

export const SECTION_ICONS = {
  insight: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path class="icon-base icon-insight__bracket" d="M23 20 H16 V44 H23" />
      <path class="icon-base icon-insight__bracket" d="M41 20 H48 V44 H41" />
      <line class="icon-guide icon-insight__line" x1="23" y1="23" x2="30" y2="30" pathLength="1" />
      <line class="icon-guide icon-insight__line" x1="41" y1="23" x2="34" y2="30" pathLength="1" />
      <line class="icon-guide icon-insight__line" x1="23" y1="41" x2="30" y2="34" pathLength="1" />
      <line class="icon-guide icon-insight__line" x1="41" y1="41" x2="34" y2="34" pathLength="1" />
      <circle class="icon-insight__ring" cx="32" cy="32" r="3" />
      <circle class="icon-stroke icon-fill icon-insight__point" cx="32" cy="32" r="2" />
    </svg>`,

  system: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <line class="icon-base icon-system__v icon-system__v--1" x1="20" y1="14" x2="20" y2="50" />
      <line class="icon-base icon-system__v icon-system__v--2" x1="32" y1="14" x2="32" y2="50" />
      <line class="icon-base icon-system__v icon-system__v--3" x1="44" y1="14" x2="44" y2="50" />
      <line class="icon-base icon-system__h icon-system__h--1" x1="14" y1="20" x2="50" y2="20" />
      <line class="icon-base icon-system__h icon-system__h--2" x1="14" y1="32" x2="50" y2="32" />
      <line class="icon-base icon-system__h icon-system__h--3" x1="14" y1="44" x2="50" y2="44" />
      <rect class="icon-fill icon-system__core" x="28" y="28" width="8" height="8" />
    </svg>`,

  services: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <polygon class="icon-base icon-services__layer icon-services__layer--bottom" points="32,36 47,42 32,48 17,42" />
      <polygon class="icon-base icon-services__layer icon-services__layer--mid" points="32,28 47,34 32,40 17,34" />
      <polygon class="icon-fill icon-services__layer icon-services__layer--top" points="32,20 47,26 32,32 17,26" />
    </svg>`,

  method: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <line class="icon-guide icon-method__path icon-method__path--1" x1="20" y1="18" x2="44" y2="18" pathLength="1" />
      <line class="icon-guide icon-method__path icon-method__path--2" x1="48" y1="22" x2="48" y2="42" pathLength="1" />
      <line class="icon-guide icon-method__path icon-method__path--3" x1="44" y1="46" x2="22" y2="46" pathLength="1" />
      <rect class="icon-stroke icon-fill icon-method__node icon-method__node--a" x="12" y="14" width="8" height="8" />
      <circle class="icon-stroke icon-fill icon-method__node icon-method__node--b" cx="48" cy="18" r="4.2" />
      <rect class="icon-stroke icon-fill icon-method__node icon-method__node--c" x="44" y="42" width="8" height="8" />
      <polygon class="icon-stroke icon-fill icon-method__node icon-method__node--d" points="16,40 22,46 16,52 10,46" />
    </svg>`,

  philosophy: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g class="icon-philosophy__outer">
        <circle class="icon-base" cx="32" cy="32" r="19" />
        <rect class="icon-base" x="19" y="19" width="26" height="26" transform="rotate(12 32 32)" />
        <line class="icon-base" x1="32" y1="15" x2="32" y2="49" />
        <line class="icon-base" x1="15" y1="32" x2="49" y2="32" />
      </g>
      <circle class="icon-fill icon-philosophy__core" cx="32" cy="32" r="2.4" />
    </svg>`,

  connect: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect class="icon-base icon-connect__block icon-connect__block--you" x="8" y="24" width="13" height="16" />
      <rect class="icon-base icon-connect__block icon-connect__block--abra" x="43" y="24" width="13" height="16" />
      <line class="icon-guide icon-connect__bridge" x1="30" y1="32" x2="34" y2="32" pathLength="1" />
      <circle class="icon-fill icon-connect__point" cx="32" cy="32" r="2" />
    </svg>`,

  contact: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path class="icon-base icon-contact__bracket icon-contact__bracket--left" d="M24 21 H17 V43 H24" />
      <path class="icon-base icon-contact__bracket icon-contact__bracket--right" d="M40 21 H47 V43 H40" />
      <line class="icon-guide icon-contact__guide" x1="32" y1="24" x2="32" y2="30" pathLength="1" />
      <line class="icon-guide icon-contact__guide" x1="32" y1="34" x2="32" y2="40" pathLength="1" />
      <line class="icon-guide icon-contact__guide" x1="24" y1="32" x2="30" y2="32" pathLength="1" />
      <line class="icon-guide icon-contact__guide" x1="34" y1="32" x2="40" y2="32" pathLength="1" />
      <circle class="icon-contact__ring" cx="32" cy="32" r="3" />
      <circle class="icon-stroke icon-fill icon-contact__point" cx="32" cy="32" r="2" />
    </svg>`,
};

// ABRAXUS EXTENDED — тема Hermes Desktop на дизайн-токенах a-bra.ru.
// Источник — hermes-theme/extended/plugin.js в репозитории сайта; ставится копией в
// ~/.hermes/desktop-plugins/abraxus-extended/plugin.js (см. INSTALL.md рядом).
// Цвета берутся только из блока ABX ниже — его пишет build.mjs из tokens.json.
import {
  atom,
  host,
  PALETTE_AREA,
  ROUTES_AREA,
  SESSION_ROW_AREAS,
  SIDEBAR_NAV_AREA,
  STATUSBAR_AREAS,
  THEMES_AREA,
  TITLEBAR_AREAS,
  useI18n,
  useTheme,
  useValue
} from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

// <tokens>
// Пишет build.mjs из hermes-theme/tokens.json — руками не править.
const ABX = {
  "colors": {
    "background": "#0C0B09",
    "foreground": "#CEC9C3",
    "card": "#131210",
    "cardForeground": "#CEC9C3",
    "muted": "#131210",
    "mutedForeground": "#84817C",
    "popover": "#131210",
    "popoverForeground": "#CEC9C3",
    "primary": "#B87333",
    "primaryForeground": "#0C0B09",
    "secondary": "#2B1E11",
    "secondaryForeground": "#EDEBE6",
    "accent": "#2B1E11",
    "accentForeground": "#EDEBE6",
    "border": "#2B2927",
    "input": "#63615D",
    "ring": "#B87333",
    "midground": "#B87333",
    "midgroundForeground": "#0C0B09",
    "composerRing": "#B87333",
    "destructive": "#C07460",
    "destructiveForeground": "#0C0B09",
    "sidebarBackground": "#0C0B09",
    "sidebarBorder": "#2B2927",
    "userBubble": "#131210",
    "userBubbleBorder": "#2B2927"
  },
  "terminal": {
    "foreground": "#CEC9C3",
    "cursor": "#B87333",
    "selectionBackground": "#2B1E11",
    "black": "#131210",
    "red": "#C07460",
    "green": "#7C9A6E",
    "yellow": "#C9A24B",
    "blue": "#6E86A0",
    "magenta": "#B87333",
    "cyan": "#D0A984",
    "white": "#CEC9C3",
    "brightBlack": "#84817C",
    "brightRed": "#C07460",
    "brightGreen": "#7C9A6E",
    "brightYellow": "#C9A24B",
    "brightBlue": "#6E86A0",
    "brightMagenta": "#B87333",
    "brightCyan": "#D0A984",
    "brightWhite": "#EDEBE6"
  },
  "mark": {
    "stroke": "#B87333",
    "signal": "#EDEBE6"
  },
  "solid": {
    "fill": "#B87333",
    "ink": "#0C0B09"
  }
}
// </tokens>

// <content>
// Пишет build.mjs из hermes-theme/extended/content.json — руками не править.
const CONTENT = {
  "motto": "Магии не будет. Система будет.",
  "labels": [
    {
      "id": "tech",
      "name": "Техническое",
      "glyph": "dot",
      "color": "muted",
      "words": [
        "плагин",
        "hermes",
        "doctor",
        "доктор",
        "subagent",
        "batch",
        "export",
        "код",
        "тему",
        "темы",
        "инструмент",
        "исправь",
        "проверь"
      ]
    },
    {
      "id": "abra",
      "name": "ABRA",
      "glyph": "ring",
      "color": "accent",
      "words": [
        "abra",
        "a-bra",
        "бренд",
        "сайт",
        "кейс",
        "статья",
        "контент"
      ]
    },
    {
      "id": "client",
      "name": "Клиент",
      "glyph": "dot",
      "color": "accent",
      "words": [
        "мастерстрой",
        "жби",
        "gbi",
        "директ",
        "кампани",
        "расход",
        "cpc",
        "ctr",
        "callibri",
        "amocrm",
        "сделк",
        "сделок",
        "лид",
        "обращени",
        "воронк",
        "отчёт"
      ]
    }
  ],
  "templates": [
    {
      "id": "funnel",
      "title": "Диагностика воронки",
      "text": "Восстанови фактическую воронку {клиент} за {период}: baseline по этапам, где теряются лиды, симптомы против причин. Источники: Директ, Callibri, amoCRM."
    },
    {
      "id": "direct",
      "title": "Отчёт по Директу",
      "text": "Read-only отчёт по кампаниям Яндекс Директа {кабинет} за {период}: расход, показы, клики, CTR, CPC, конверсии. В кабинете ничего не меняй."
    },
    {
      "id": "leads",
      "title": "Сверка лидов",
      "text": "Сверь обращения Callibri со сделками amoCRM за {период}: потерянные, нецелевые, без сделки."
    },
    {
      "id": "deals",
      "title": "Разбор сделок",
      "text": "Проанализируй сделки amoCRM {воронка}: застрявшие, без задач, просроченные; у кого следующий шаг."
    },
    {
      "id": "note",
      "title": "Field note",
      "text": "Сформулируй field note из этого наблюдения: один тезис, один конфликт, один вывод."
    }
  ],
  "method": [
    {
      "step": "Увидеть",
      "text": "Восстановить фактическую картину: данные, baseline, источник."
    },
    {
      "step": "Понять",
      "text": "Найти причинность и отделить симптомы от причин."
    },
    {
      "step": "Спроектировать",
      "text": "Спроектировать переход: приоритеты, ответственные, риски, контрольные точки."
    },
    {
      "step": "Построить",
      "text": "Поставить изменение на землю, не ломая работающий контур."
    },
    {
      "step": "Усилить",
      "text": "Проверить результат в реальности и начать следующий цикл."
    }
  ]
}
// </content>

// <motion>
// Пишет build.mjs из abra-motion/src/tokens.js и motion.js — руками не править.
const MOTION = (() => {
  const scope = {}
;/* ABRAXUS MOTION — дизайн-токены.
   Обычный скрипт (не ES-модуль), чтобы предпросмотр открывался двойным
   кликом по file:// без сервера. Экспорт читает этот же файл.

   Цвета — значения работающего сайта (src/style.css, :root). Новых цветов
   нет: всё второстепенное — те же цвета с прозрачностью. scripts/export.mjs
   сверяет HEX-значения со style.css перед рендером.

   Геометрия знака — дословно из public/mark.svg. Экспорт сверяет и её. */
(function (root) {
  root.AbraMotionTokens = {
    color: {
      accent: "#B87333", // --accent — сам знак
      bg: "#0C0B09", //     --bg     — тёмная подложка предпросмотра
      text: "#CEC9C3", //   --text   — подписи предпросмотра
    },

    mark: {
      // public/mark.svg, без единой правки
      d: "M 6 155 L 82 75 A 44 44 0 1 0 18 75 L 94 155 Z",
      // Толщина линии в единицах знака. На сайте она зависит от размера:
      // 6 в mark.svg, 10 в шапке и футере, 11 во вкладке панели, 12 в
      // favicon (самый мелкий показ). Эмодзи живёт в 20–24 px — берём
      // favicon-вес.
      stroke: 12,
    },

    canvas: {
      size: 100, //  Telegram custom emoji: ровно 100×100
      fps: 30, //    максимум Telegram
      pad: 3, //     поле от края кадра, px — антиалиасинг не режется
    },

    // Длительность цикла, с. Лимит Telegram — 3 с; держим запас, чтобы
    // округление контейнера не дало 3,01.
    duration: {
      axialY: 2.8,
      orbital: 2.8,
    },

    axialY: {
      // Камера в единицах знака (ширина знака — 88). 420 даёт ±10 %
      // перспективы — монета, а не объём.
      camera: 420,
      // Модуляция скорости: −0.3 — дольше смотрим на лицевую сторону,
      // быстрее проходим ребро, где знак превращается в линию.
      dwell: -0.3,
    },

    orbital: {
      ringWidth: 2, //      px в кадре 100
      ringOpacity: 0.32,
      dotRadius: 4.5, //    px
      trail: 0.22, //       длина следа, доля окружности
      trailOpacity: 0.5,
      gap: 7, //            зазор между знаком и орбитой, px
    },
  };
})(scope);
;/* ABRAXUS MOTION — анимации знака как чистые функции времени.

   frame(variant, t) → строка SVG для момента t ∈ [0, 1) цикла. Никакого
   состояния, таймеров и DOM: одно и то же t всегда даёт один и тот же
   кадр. Отсюда два свойства системы:
   — бесшовный цикл по построению: все кривые движения периодичны,
     кадр при t = 1 совпадает с кадром при t = 0;
   — предпросмотр и экспорт рисуют одним кодом: страница вызывает frame()
     по requestAnimationFrame, scripts/export.mjs — для каждого кадра WEBM.

   Обычный скрипт без модулей — см. комментарий в tokens.js. */
(function (root) {
  const T = root.AbraMotionTokens;
  const C = T.canvas.size;
  const HALF = C / 2;
  const TAU = Math.PI * 2;

  /* ---------- геометрия знака ---------- */

  // Разбор d из tokens.mark.d. Поддержаны только M, L, A, Z — ровно то, из
  // чего состоит знак; на всё остальное падаем громко, а не рисуем мимо.
  function parseMark(d) {
    const tok = d.match(/[MLAZ]|-?\d*\.?\d+/g);
    const segs = [];
    let i = 0;
    let start = null;
    let cur = null;
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      const cmd = tok[i++];
      if (cmd === "M") {
        cur = start = [num(), num()];
      } else if (cmd === "L") {
        const p = [num(), num()];
        segs.push(line(cur, p));
        cur = p;
      } else if (cmd === "A") {
        const rx = num();
        const ry = num();
        num(); // поворот эллипса — у окружности не важен
        const large = num();
        const sweep = num();
        const p = [num(), num()];
        if (rx !== ry) throw new Error("Знак: ожидалась дуга окружности");
        segs.push(arc(cur, p, rx, large, sweep));
        cur = p;
      } else if (cmd === "Z") {
        segs.push(line(cur, start));
        cur = start;
      } else {
        throw new Error("Знак: неизвестная команда " + cmd);
      }
    }
    return segs;
  }

  function line(a, b) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return {
      type: "L",
      a,
      b,
      len,
      at: (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
    };
  }

  // Дуга SVG по конечным точкам → центр и углы (SVG 1.1, F.6.5 для
  // окружности без поворота).
  function arc(a, b, r, large, sweep) {
    const mx = (a[0] - b[0]) / 2;
    const my = (a[1] - b[1]) / 2;
    const d2 = mx * mx + my * my;
    const k = Math.sqrt(Math.max(0, (r * r - d2) / d2)) * (large === sweep ? -1 : 1);
    const cx = k * my + (a[0] + b[0]) / 2;
    const cy = -k * mx + (a[1] + b[1]) / 2;
    const a0 = Math.atan2(a[1] - cy, a[0] - cx);
    let a1 = Math.atan2(b[1] - cy, b[0] - cx);
    let span = a1 - a0;
    if (sweep && span < 0) span += TAU;
    if (!sweep && span > 0) span -= TAU;
    return {
      type: "A",
      a,
      b,
      r,
      large,
      sweep,
      c: [cx, cy],
      len: Math.abs(span) * r,
      at: (u) => [cx + r * Math.cos(a0 + span * u), cy + r * Math.sin(a0 + span * u)],
    };
  }

  const SEGS = parseMark(T.mark.d);
  const [LEG1, ARC, LEG2, BASE] = SEGS;
  if (SEGS.length !== 4 || ARC.type !== "A") throw new Error("Знак: структура изменилась");

  // Плотная выборка контура — для описанной окружности.
  function sample(seg, step) {
    if (seg.type === "L") return [seg.a, seg.b];
    const n = Math.max(2, Math.ceil(seg.len / step));
    const pts = [];
    for (let j = 0; j <= n; j++) pts.push(seg.at(j / n));
    return pts;
  }
  const OUTLINE = SEGS.flatMap((s) => sample(s, 1));

  // Знак симметричен относительно x = 50. Центр вращения — центр
  // наименьшей описанной окружности на этой оси: знак не задевает край
  // кадра ни при каком угле, и обе оси вращения проходят через одну точку.
  const AXIS_X = (LEG1.a[0] + BASE.a[0]) / 2;
  const maxDist = (cy) => Math.max(...OUTLINE.map((p) => Math.hypot(p[0] - AXIS_X, p[1] - cy)));
  let lo = 0;
  let hi = 160;
  for (let j = 0; j < 80; j++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (maxDist(m1) < maxDist(m2)) hi = m2;
    else lo = m1;
  }
  const PIVOT = [AXIS_X, (lo + hi) / 2];
  const R_OUT = maxDist(PIVOT[1]) + T.mark.stroke / 2; // с учётом толщины

  // Масштаб знака в AXIAL и в эталоне «оригинал» — знак во весь кадр.
  const K_MAIN = (HALF - T.canvas.pad) / R_OUT;

  /* ---------- утилиты ---------- */

  const r2 = (v) => Math.round(v * 100) / 100;
  const pt = (p) => r2(p[0]) + " " + r2(p[1]);
  
  function svg(body, size) {
    const s = size || C;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C} ${C}" width="${s}" height="${s}">` +
      body +
      "</svg>"
    );
  }

  // Группа, которая ставит знак центром вращения в центр кадра.
  function markGroup(k, inner) {
    return (
      `<g transform="translate(${HALF} ${HALF}) scale(${r2(k * 1e4) / 1e4}) ` +
      `translate(${-PIVOT[0]} ${r2(-PIVOT[1])})" fill="none" stroke-linecap="round" ` +
      `stroke-linejoin="round">` +
      inner +
      "</g>"
    );
  }

  const markPath = () =>
    `<path d="${T.mark.d}" stroke="${T.color.accent}" stroke-width="${T.mark.stroke}"/>`;

  /* ---------- 01 / AXIAL · Y: монета ---------- */

  // Плоский знак в плоскости z = 0 поворачивается вокруг оси симметрии и
  // проецируется центральной проекцией. Прямые при проекции остаются
  // прямыми, поэтому отрезки идут по вершинам, а дуга — по выборке через
  // каждую единицу знака. Толщина линии не проецируется: знак остаётся
  // рисунком, а не пластиной, и на ребре не исчезает до нуля.
  function axialY(t) {
    const th = TAU * t + T.axialY.dwell * Math.sin(2 * TAU * t);
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    const D = T.axialY.camera;
    const k = K_MAIN;
    const proj = (p) => {
      const x = p[0] - PIVOT[0];
      const y = p[1] - PIVOT[1];
      const s = D / (D + x * sin);
      return [HALF + k * x * cos * s, HALF + k * y * s];
    };
    const pts = [LEG1.a, ...sample(ARC, 1), LEG2.b];
    const d = "M " + pts.map((p) => pt(proj(p))).join(" L ") + " Z";
    return (
      `<path d="${d}" fill="none" stroke="${T.color.accent}" ` +
      `stroke-width="${r2(T.mark.stroke * k)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  /* ---------- 02 / ORBITAL ---------- */

  function orbital(t) {
    const o = T.orbital;
    // Маркер толще кольца — по нему и отмеряем поле, иначе на 12 часах
    // он упирается в край кадра.
    const R = HALF - T.canvas.pad - Math.max(o.ringWidth / 2, o.dotRadius);
    const k = (R - o.gap - o.ringWidth / 2) / R_OUT;
    const phi = -Math.PI / 2 + TAU * t; // от 12 часов по часовой
    const onRing = (a) => [HALF + R * Math.cos(a), HALF + R * Math.sin(a)];

    let trail = "";
    const steps = 8;
    const span = TAU * o.trail;
    for (let j = 0; j < steps; j++) {
      const a0 = phi - span * (1 - j / steps);
      const a1 = phi - span * (1 - (j + 1) / steps);
      const op = o.ringOpacity + (o.trailOpacity - o.ringOpacity) * ((j + 1) / steps);
      trail +=
        `<path d="M ${pt(onRing(a0))} A ${R} ${R} 0 0 1 ${pt(onRing(a1))}" ` +
        `stroke-opacity="${r2(op)}"/>`;
    }
    const dot = onRing(phi);
    return (
      `<circle cx="${HALF}" cy="${HALF}" r="${r2(R)}" fill="none" stroke="${T.color.accent}" ` +
      `stroke-width="${o.ringWidth}" stroke-opacity="${o.ringOpacity}"/>` +
      `<g fill="none" stroke="${T.color.accent}" stroke-width="${o.ringWidth}" ` +
      `stroke-linecap="butt">${trail}</g>` +
      `<circle cx="${r2(dot[0])}" cy="${r2(dot[1])}" r="${o.dotRadius}" fill="${T.color.accent}"/>` +
      markGroup(k, markPath())
    );
  }

  /* ---------- публичное API ---------- */

  const VARIANTS = {
    axialY: { id: "01-axial-y", name: "AXIAL · Y", note: "монета", draw: axialY },
    orbital: { id: "02-orbital", name: "ORBITAL", note: "маркер по орбите", draw: orbital },
  };

  root.AbraMotion = {
    tokens: T,
    variants: Object.keys(VARIANTS).map((key) => ({
      key,
      ...VARIANTS[key],
      duration: T.duration[key],
      frames: Math.round(T.duration[key] * T.canvas.fps),
    })),
    // Кадр варианта в момент t ∈ [0, 1).
    frame(key, t, size) {
      const v = VARIANTS[key];
      if (!v) throw new Error("Нет варианта " + key);
      const u = ((t % 1) + 1) % 1;
      return svg(v.draw(u), size);
    },
    // Исходный знак в той же раскладке, что AXIAL · Y, — для сравнения.
    original(size) {
      return svg(markGroup(K_MAIN, markPath()), size);
    },
    geometry: { pivot: PIVOT, outerRadius: R_OUT, scale: K_MAIN },
  };
})(scope);
  return scope.AbraMotion
})()
// </motion>

export const THEME_NAME = 'abraxus-extended'

// Знак ABRA — путь из public/mark.svg сайта. Кольцо — окружность r = 44
// через (18; 75) и (82; 75), её центр (50; 44,8).
export const MARK_PATH = 'M 6 155 L 82 75 A 44 44 0 1 0 18 75 L 94 155 Z'
const SPLASH_VIEWBOX = '-14 -14 128 185'

// Заставка нового чата: контур рисуется за 2,4 с, затем раз в 6 с по нему
// пробегает светлый штрих (вариант B). Без animated — статичный знак.
export function splashSvg(animated) {
  const line = `fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" d="${MARK_PATH}"`
  const style = animated
    ? '<style>.b{stroke-dasharray:1;animation:d 2.4s ease-out both}' +
      '.t{stroke-dasharray:.07 .93;stroke-dashoffset:1;opacity:0;animation:r 6s linear 2.4s infinite}' +
      '@keyframes d{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}' +
      '@keyframes r{from{opacity:1;stroke-dashoffset:1}to{opacity:1;stroke-dashoffset:0}}</style>'
    : ''
  const trace = animated ? `<path class="t" stroke="${ABX.mark.signal}" ${line}/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPLASH_VIEWBOX}">${style}<path class="b" stroke="${ABX.mark.stroke}" ${line}/>${trace}</svg>`
}

const svgUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

// Единственное согласованное исключение из «CSS только через переменные»:
// надпись HERMES AGENT на заставке нового чата заменяется знаком. Если Hermes
// поменяет атрибут или класс, правило перестанет совпадать — вернётся надпись.
export const INTRO_SELECTOR = '[data-slot="aui_intro"] .wordmark'

// Ещё два согласованных исключения, с тем же молчаливым откатом.
// Метки панелей (SidebarPanelLabel: квадратик .dither, за ним текст .truncate)
// получают фирменный формат сайта [ .МЕТКА ] вместо квадратика.
export const LABEL_TEXT_SELECTOR = '.dither + .truncate'
export const LABEL_DOT_SELECTOR = '.dither:has(+ .truncate)'
// Поле ввода — как кнопка .abra-cta на сайте: медные уголки 12×15 px, при
// фокусе горизонтали смыкаются в рамку за 320 мс.
export const COMPOSER_SELECTOR = '[data-slot="composer-surface"]'

// Фон за перепиской: на месте статуи Hermes (тумблер фона в Appearance) —
// созвездие из hero сайта. Ответы агента — с медной линией, курсор — медный.
export const BACKDROP_SELECTOR = 'div:has(> img[src*="filler-bg0"])'
export const ASSISTANT_SELECTOR = '[data-slot="aui_assistant-message-content"]'
export const CARET_SELECTOR = '[data-slot="composer-rich-input"]'

// Созвездие как в src/hero.js: 90 точек, связь при расстоянии < 16 % диагонали,
// прозрачность (1 − d / L) × 0,5, каждая шестая связь медная. Генератор с
// фиксированным зерном — картинка одна и та же при каждом запуске.
export function constellationSvg() {
  const W = 1600
  const H = 1000
  let seed = 20260908
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
  const nodes = Array.from({ length: 90 }, () => ({ x: rand() * W, y: rand() * H, depth: rand() }))
  const limit = Math.hypot(W, H) * 0.16
  const paths = {}
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
      if (d >= limit) continue
      const alpha = Math.max(1, Math.round((1 - d / limit) * 0.5 * 10)) / 10
      const color = (i + j) % 6 === 0 ? ABX.mark.stroke : ABX.colors.foreground
      const bucket = `${color}|${alpha}`
      paths[bucket] = (paths[bucket] ?? '') + `M${nodes[i].x | 0} ${nodes[i].y | 0}L${nodes[j].x | 0} ${nodes[j].y | 0}`
    }
  }
  const lines = Object.entries(paths)
    .map(([bucket, d]) => {
      const [color, alpha] = bucket.split('|')
      return `<path d="${d}" stroke="${color}" stroke-opacity="${alpha}" fill="none"/>`
    })
    .join('')
  const dots = nodes
    .map(n => `<circle cx="${n.x | 0}" cy="${n.y | 0}" r="${(1.1 + n.depth * 0.9).toFixed(1)}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${lines}<g fill="${ABX.colors.foreground}" fill-opacity=".85">${dots}</g></svg>`
}

// Компактный data URI: экранируются только символы, которые ломают url() —
// почти вдвое короче encodeURIComponent, а лимит customCSS у Hermes — 32 КБ.
const svgUrlCompact = svg =>
  `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`

const CORNER = `linear-gradient(${ABX.mark.stroke}, ${ABX.mark.stroke})`
// Каждый уголок — два слоя фона: горизонталь и вертикаль; порядок слоёв
// совпадает с CORNER_POSITIONS (левый верх, правый верх, левый низ, правый низ).
const cornerSizes = horizontal => Array(4).fill(`${horizontal} 1px, 1px 15px`).join(', ')
const CORNER_POSITIONS = 'left top, left top, right top, right top, left bottom, left bottom, right bottom, right bottom'

export const CUSTOM_CSS = `
:root {
  --dt-primary-solid: ${ABX.solid.fill} !important;
  --dt-primary-solid-foreground: ${ABX.solid.ink} !important;
}
${INTRO_SELECTOR} {
  width: 116px !important;
  height: 170px;
  margin-inline: auto;
  mix-blend-mode: normal;
  background: ${svgUrl(splashSvg(true))} center / contain no-repeat;
}
${INTRO_SELECTOR} > * {
  display: none !important;
}
${LABEL_DOT_SELECTOR} {
  display: none !important;
}
${LABEL_TEXT_SELECTOR}::before {
  content: "[ .";
}
${LABEL_TEXT_SELECTOR}::after {
  content: " ]";
}
${COMPOSER_SELECTOR} {
  border-color: transparent !important;
}
${COMPOSER_SELECTOR}::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background-image: ${Array(8).fill(CORNER).join(', ')};
  background-position: ${CORNER_POSITIONS};
  background-repeat: no-repeat;
  background-size: ${cornerSizes('12px')};
  transition: background-size 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
${COMPOSER_SELECTOR}:focus-within::after {
  background-size: ${cornerSizes('calc(50% + 1px)')};
}
${CARET_SELECTOR} {
  caret-color: ${ABX.mark.stroke};
}
${ASSISTANT_SELECTOR} {
  border-left: 1px solid ${ABX.mark.stroke};
  padding-left: 14px;
}
${BACKDROP_SELECTOR} {
  opacity: 0.25 !important;
  mix-blend-mode: normal !important;
  overflow: hidden;
}
${BACKDROP_SELECTOR} > img {
  display: none !important;
}
${BACKDROP_SELECTOR}::before {
  content: "";
  position: absolute;
  inset: -4%;
  background: ${svgUrlCompact(constellationSvg())} center / cover no-repeat;
  animation: abx-drift 90s ease-in-out infinite alternate;
}
@keyframes abx-drift {
  from { transform: translate3d(-1.5%, -1%, 0); }
  to { transform: translate3d(1.5%, 1%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  ${BACKDROP_SELECTOR}::before {
    animation: none;
  }
  ${INTRO_SELECTOR} {
    background-image: ${svgUrl(splashSvg(false))};
  }
  ${COMPOSER_SELECTOR}::after {
    transition: none;
  }
}
`.trim()

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", emoji'

export const THEME = {
  name: THEME_NAME,
  label: 'ABRAXUS',
  description: 'Медь на графите — дизайн-система a-bra.ru',
  colors: ABX.colors,
  darkColors: ABX.colors,
  typography: {
    fontSans: `Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif, ${EMOJI}`,
    fontMono: `"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace, ${EMOJI}`,
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
  },
  terminal: ABX.terminal,
  darkTerminal: ABX.terminal,
  customCSS: CUSTOM_CSS
}

// Анимации знака — те же, что у эмодзи ABRAXUS в Telegram (abra-motion).
// motionSvg(variant, t, size) — кадр в момент t ∈ [0, 1) цикла, чистая функция.
export const motionSvg = (variant, t, size) => MOTION.frame(variant, t, size)
const MOTION_FPS = 30

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof matchMedia === 'function' && matchMedia(REDUCE_QUERY).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined
    const query = matchMedia(REDUCE_QUERY)
    const onChange = event => setReduce(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduce
}

// Доля цикла, пока running; иначе 0. 30 кадров в секунду — как в Telegram.
function useCycle(variant, running) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!running || typeof requestAnimationFrame !== 'function') return undefined
    const duration = MOTION.tokens.duration[variant] * 1000
    const start = performance.now()
    let last = -Infinity
    let raf = requestAnimationFrame(function tick(now) {
      if (now - last >= 1000 / MOTION_FPS) {
        last = now
        setT(((now - start) / duration) % 1)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => {
      cancelAnimationFrame(raf)
      setT(0)
    }
  }, [variant, running])
  return t
}

// SVG кадра — строка, которую строит сам плагин из своих токенов.
const MotionFrame = ({ variant, t, size }) =>
  jsx('span', {
    'aria-hidden': true,
    style: { display: 'block', width: size, height: size, lineHeight: 0 },
    dangerouslySetInnerHTML: { __html: motionSvg(variant, t, size) }
  })

// Строка статуса: ORBITAL. Агент свободен — маркер стоит на 12 часах; работает —
// идёт по кольцу. «Уменьшить движение» — при работе маркер стоит на 3 часах.
export const STATUS_SIZE = 18
export const STATUS_REDUCED_BUSY_T = 0.25

export function StatusMark() {
  const { themeName } = useTheme()
  const busy = useValue(host.state.busy)
  const reduce = useReducedMotion()
  const t = useCycle('orbital', busy && !reduce)
  if (themeName !== THEME_NAME) return null
  const label = busy ? 'ABRAXUS — работает' : 'ABRAXUS — свободен'
  return jsx('span', {
    role: 'img',
    'aria-label': label,
    title: label,
    style: { display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 4px' },
    children: jsx(MotionFrame, { variant: 'orbital', t: busy && reduce ? STATUS_REDUCED_BUSY_T : t, size: STATUS_SIZE })
  })
}

// Шапка страницы ABRAXUS: AXIAL · Y — знак поворачивается, как монета.
export const PAGE_MARK_SIZE = 64

export function PageMark() {
  const reduce = useReducedMotion()
  const t = useCycle('axialY', !reduce)
  return jsx(MotionFrame, { variant: 'axialY', t, size: PAGE_MARK_SIZE })
}

// ── Тексты ──────────────────────────────────────────────────────────────────
// Штатный механизм языковых пакетов Hermes: поверх текущего каталога
// регистрируются фирменные подсказки, строка заставки и имя ABRAXUS вместо
// Hermes. Только пока выбрана тема ABRAXUS.
export const NEW_SESSION_PLACEHOLDERS = [
  'Какую систему разбираем?',
  'Где теряются деньги?',
  'Маркетинг, продажи, аналитика или продукт?',
  'С какой цифры начнём?',
  'Что сейчас не сходится?'
]
export const FOLLOW_UP_PLACEHOLDERS = ['Добавьте вводные', 'Что проверить дальше?', 'Копнуть глубже?']
export const INTRO_LINE = 'ABRAXUS / SYSTEM CORE на связи. Опишите задачу — разложу её по системе.'

// Служебные тексты (запуск, ошибки, обновления, бэкенд, телеметрия, сервисы
// Nous) остаются с именем Hermes — чтобы совпадать с документацией и командами.
export const SERVICE_KEY =
  /boot|start|reconnect|sharedMetrics|connector|connections|gateway|error|fail|update|upgrade|backend|outOfDate|version|install|restart|vault|doctor|diagnos|reset|storage|methodNotAllowed|codeSkew/i
// Названия продуктов Nous (Hermes Cloud, Hermes Desktop, Hermes Agent) — не трогаем.
const NAME = /\bHermes\b(?! (?:Cloud|Desktop|Agent)\b)/g
const rename = value => (typeof value === 'string' ? value.replace(NAME, 'ABRAXUS') : value)
export const hasName = value => typeof value === 'string' && value.search(NAME) >= 0

// Функция каталога «пробуется» заглушками: если в результате есть Hermes —
// оборачивается переименованием, иначе не трогается.
function probe(fn) {
  try {
    return fn('X', 'X', 'X', 'X')
  } catch {
    return undefined
  }
}

function renameTree(node, path) {
  if (SERVICE_KEY.test(path)) return undefined
  if (typeof node === 'string') return hasName(node) ? rename(node) : undefined
  if (Array.isArray(node)) return node.some(hasName) ? node.map(rename) : undefined
  if (typeof node === 'function') {
    const sample = probe(node)
    const touched = hasName(sample) || (Array.isArray(sample) && sample.some(hasName))
    return touched ? (...args) => {
      const out = node(...args)
      return Array.isArray(out) ? out.map(rename) : rename(out)
    } : undefined
  }
  if (!node || typeof node !== 'object') return undefined
  let out
  for (const [key, value] of Object.entries(node)) {
    const next = renameTree(value, path ? `${path}.${key}` : key)
    if (next !== undefined) (out ??= {})[key] = next
  }
  return out
}

export function brandTexts(t) {
  const out = renameTree(t, '') ?? {}
  out.composer = {
    ...out.composer,
    newSessionPlaceholders: NEW_SESSION_PLACEHOLDERS,
    followUpPlaceholders: FOLLOW_UP_PLACEHOLDERS
  }
  const stock = { '': [INTRO_LINE], default: [INTRO_LINE], none: [INTRO_LINE], neutral: [INTRO_LINE] }
  for (const key of Object.keys(t?.intro?.stock ?? {})) stock[key] = [INTRO_LINE]
  out.intro = { stock, custom: () => [INTRO_LINE] }
  return out
}

// Слияние без потерь: после регистрации каталог уже без Hermes, и новый проход
// находит меньше строк — старые подмены сохраняются, иначе тексты мигали бы.
function mergeKeep(base, next) {
  if (!base || typeof base !== 'object' || Array.isArray(base) || typeof next !== 'object' || Array.isArray(next)) {
    return next
  }
  const out = { ...base }
  for (const [key, value] of Object.entries(next)) out[key] = key in base ? mergeKeep(base[key], value) : value
  return out
}

const fingerprint = (locale, translations) =>
  locale + JSON.stringify(translations, (key, value) => (typeof value === 'function' ? `fn:${key}` : value))

let texts = null

function dropTexts() {
  texts?.dispose()
  texts = null
}

function applyTexts(active, locale, t) {
  if (!active) return dropTexts()
  const base = texts?.locale === locale ? texts.translations : {}
  const translations = mergeKeep(base, brandTexts(t))
  const print = fingerprint(locale, translations)
  if (texts?.print === print) return
  dropTexts()
  texts = { locale, translations, print, dispose: host.i18n.registerAppLocale(locale, { translations }) }
}

// Невидимый компонент в постоянном слоте заголовка окна: он есть на всех
// экранах, поэтому тексты не пропадают в настройках и на других страницах.
export function TextsBridge() {
  const { themeName } = useTheme()
  const { locale, t } = useI18n()
  const active = themeName === THEME_NAME
  useEffect(() => {
    applyTexts(active, locale, t)
  }, [active, locale, t])
  return null
}

// ── Метки сеансов ───────────────────────────────────────────────────────────
// Значок перед названием сеанса: категория по словам в названии (порядок
// CONTENT.labels — первая подходящая побеждает) или ручная метка из ⌘K.
// Названия берутся тем же RPC, что у приложения (session.list), по durable id.
const LABEL_COLORS = { accent: ABX.mark.stroke, muted: ABX.colors.mutedForeground }
const MANUAL_KEY = 'labels.manual'
const NONE = 'none'
const $titles = atom({})
const $manual = atom({})

const normalize = text => String(text ?? '').toLowerCase().replace(/ё/g, 'е')

// Слово ищется с начала слова: «кампани» находит «кампаниями», но «тему» не
// находит «систему».
const startsWord = (text, word) => {
  for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(text[at - 1])) return true
  }
  return false
}

export function classify(title) {
  const text = normalize(title)
  return CONTENT.labels.find(label => label.words.some(word => startsWord(text, normalize(word))))?.id ?? null
}

function labelOf(sessionId) {
  const manual = $manual.get()[sessionId]
  if (manual) return manual === NONE ? null : manual
  return classify($titles.get()[sessionId])
}

async function refreshTitles() {
  try {
    const reply = await host.request('session.list', { limit: 500 })
    const titles = {}
    for (const row of reply?.sessions ?? []) titles[row._lineage_root_id ?? row.id] = row.title ?? ''
    $titles.set(titles)
  } catch {
    // Нет связи с бэкендом — метки появятся при следующем sessions.changed.
  }
}

export function SessionLabel({ sessionId }) {
  const { themeName } = useTheme()
  useValue($titles)
  useValue($manual)
  if (themeName !== THEME_NAME) return null
  const label = CONTENT.labels.find(item => item.id === labelOf(sessionId))
  if (!label) return null
  const color = LABEL_COLORS[label.color]
  return jsx('span', {
    role: 'img',
    'aria-label': label.name,
    title: label.name,
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      width: 6,
      height: 6,
      marginRight: 4,
      borderRadius: '50%',
      boxSizing: 'border-box',
      background: label.glyph === 'dot' ? color : 'transparent',
      border: label.glyph === 'ring' ? `1px solid ${color}` : 'none'
    }
  })
}

function setManualLabel(storage, value) {
  const sessionId = host.state.focusedStoredSessionId.get()
  if (!sessionId) return
  const next = { ...$manual.get() }
  if (value === null) delete next[sessionId]
  else next[sessionId] = value
  $manual.set(next)
  storage.set(MANUAL_KEY, next)
}

// ── Шаблоны задач ───────────────────────────────────────────────────────────
// Шаблон вставляется в поле ввода, но не отправляется: {скобки} дописываются
// руками. Если поля ввода на экране нет (страница ABRAXUS, настройки) —
// переход в новый чат и вторая попытка, когда поле смонтируется.
export async function insertTemplate(text) {
  if (await host.composer.insertText(null, text)) return true
  host.navigate('/')
  await new Promise(resolve => setTimeout(resolve, 250))
  return host.composer.insertText(null, text)
}

// ── Страница ABRAXUS ────────────────────────────────────────────────────────
export const PAGE_PATH = '/abraxus'
const ink = { snow: ABX.colors.secondaryForeground, text: ABX.colors.foreground, muted: ABX.colors.mutedForeground }
const tag = text => jsx('div', {
  style: { color: ABX.mark.stroke, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', margin: '40px 0 16px' },
  children: `[ .${text} ]`
})

export function AbraxusPage() {
  return jsxs('div', {
    style: { height: '100%', overflowY: 'auto', background: ABX.colors.background, color: ink.text },
    children: jsxs('div', {
      style: { maxWidth: 880, margin: '0 auto', padding: '48px 32px 80px' },
      children: [
        jsxs('div', {
          style: { display: 'flex', alignItems: 'center', gap: 20 },
          children: [
            jsx(PageMark, {}),
            jsxs('div', {
              children: [
                jsx('h1', { style: { margin: 0, fontSize: 28, fontWeight: 600, color: ink.snow }, children: 'ABRAXUS' }),
                jsx('p', { style: { margin: '4px 0 0', color: ink.muted }, children: CONTENT.motto })
              ]
            })
          ]
        }),
        tag('Задачи'),
        jsx('div', {
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
          children: CONTENT.templates.map(template =>
            jsxs('button', {
              key: template.id,
              type: 'button',
              onClick: () => insertTemplate(template.text),
              style: {
                textAlign: 'left',
                cursor: 'pointer',
                background: ABX.colors.card,
                color: ink.text,
                border: `1px solid ${ABX.colors.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                font: 'inherit'
              },
              children: [
                jsx('div', { style: { color: ink.snow, fontWeight: 600, marginBottom: 6 }, children: template.title }),
                jsx('div', { style: { color: ink.muted, fontSize: 13, lineHeight: 1.5 }, children: template.text })
              ]
            })
          )
        }),
        tag('Метод'),
        jsx('ol', {
          style: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 },
          children: CONTENT.method.map((item, index) =>
            jsxs('li', {
              key: item.step,
              style: { display: 'grid', gridTemplateColumns: '40px 160px 1fr', alignItems: 'baseline' },
              children: [
                jsx('span', { style: { color: ABX.mark.stroke, fontVariantNumeric: 'tabular-nums' }, children: `0${index + 1}` }),
                jsx('span', { style: { color: ink.snow, fontWeight: 600 }, children: item.step }),
                jsx('span', { style: { color: ink.muted }, children: item.text })
              ]
            })
          )
        })
      ]
    })
  })
}

export default {
  id: THEME_NAME,
  name: 'ABRAXUS',
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: THEME })
    // render — внутри data: только так Hermes добавляет знак в меню видимости
    // строки статуса (toggleLabel); render на верхнем уровне меню игнорирует.
    ctx.register({
      id: 'mark',
      area: STATUSBAR_AREAS.left,
      order: 0,
      data: { id: `${THEME_NAME}:mark`, toggleLabel: 'ABRAXUS', render: () => jsx(StatusMark, {}) }
    })
    ctx.register({ id: 'texts', area: TITLEBAR_AREAS.center, render: () => jsx(TextsBridge, {}) })
    ctx.onDispose(dropTexts)

    $manual.set(ctx.storage.get(MANUAL_KEY, {}))
    refreshTitles()
    ctx.onEvent('sessions.changed', refreshTitles)
    ctx.onEvent('gateway.ready', refreshTitles)
    ctx.register({
      id: 'session-label',
      area: SESSION_ROW_AREAS.leading,
      data: { render: ({ sessionId }) => jsx(SessionLabel, { sessionId }) }
    })
    const labelChoices = [...CONTENT.labels.map(label => [label.name, label.id]), ['Без метки', NONE], ['Автоматически', null]]
    labelChoices.forEach(([name, value], index) =>
      ctx.register({
        id: `label-${index}`,
        area: PALETTE_AREA,
        data: {
          id: `label-${index}`,
          label: `Метка сеанса: ${name}`,
          keywords: ['abraxus', 'метка', 'сеанс'],
          run: () => setManualLabel(ctx.storage, value)
        }
      })
    )
    CONTENT.templates.forEach(template =>
      ctx.register({
        id: `task-${template.id}`,
        area: PALETTE_AREA,
        data: {
          id: `task-${template.id}`,
          label: `Задача: ${template.title}`,
          keywords: ['abraxus', 'шаблон', 'задача'],
          run: () => insertTemplate(template.text)
        }
      })
    )
    ctx.register({ id: 'page', area: ROUTES_AREA, data: { path: PAGE_PATH }, render: () => jsx(AbraxusPage, {}) })
    ctx.register({ id: 'nav', area: SIDEBAR_NAV_AREA, data: { path: PAGE_PATH, label: 'ABRAXUS', codicon: 'compass' } })
  }
}

/* ABRAXUS MOTION — анимации знака как чистые функции времени.

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
})(typeof window !== "undefined" ? window : globalThis);

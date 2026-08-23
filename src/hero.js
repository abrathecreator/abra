export function initHero(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ACCENT = { r: 184, g: 115, b: 51 };
  const SNOW = { r: 206, g: 201, b: 195 };

  const NODE_COUNT = 90;
  const LINK_DIST_RATIO = 0.16;
  const PARALLAX_STRENGTH = 22;

  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 2 - 1,
      vx: (Math.random() - 0.5) * 0.00028,
      vy: (Math.random() - 0.5) * 0.00028,
      vz: (Math.random() - 0.5) * 0.0009,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.targetX = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    mouse.targetY = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };
  const hasCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (hasCursor) window.addEventListener("pointermove", onMove);

  let width = 0;
  let height = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener("resize", resize);

  const sx = new Float32Array(NODE_COUNT);
  const sy = new Float32Array(NODE_COUNT);

  let rafId = 0;
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / 1000;

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    for (let i = 0; i < NODE_COUNT; i++) {
      const n = nodes[i];
      n.x += n.vx + Math.sin(t * 0.2 + n.phase) * 0.00004;
      n.y += n.vy + Math.cos(t * 0.15 + n.phase * 0.7) * 0.00004;
      n.z += n.vz;

      if (n.x > 1 || n.x < 0) n.vx *= -1;
      if (n.y > 1 || n.y < 0) n.vy *= -1;
      if (n.z > 1 || n.z < -1) n.vz *= -1;
    }

    ctx.clearRect(0, 0, width, height);

    const diag = Math.sqrt(width * width + height * height);
    const linkDist = diag * LINK_DIST_RATIO;

    for (let i = 0; i < NODE_COUNT; i++) {
      const n = nodes[i];
      const depth = (n.z + 1) / 2;
      const px = mouse.x * PARALLAX_STRENGTH * (0.4 + depth * 0.6);
      const py = mouse.y * PARALLAX_STRENGTH * 0.6 * (0.4 + depth * 0.6);
      sx[i] = n.x * width + px;
      sy[i] = n.y * height + py;
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = sx[i] - sx[j];
        const dy = sy[i] - sy[j];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          const alpha = (1 - dist / linkDist) * 0.5;
          const useAccent = (i + j) % 6 === 0;
          const c = useAccent ? ACCENT : SNOW;
          ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(sx[i], sy[i]);
          ctx.lineTo(sx[j], sy[j]);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = `rgba(${SNOW.r}, ${SNOW.g}, ${SNOW.b}, 0.85)`;
    for (let i = 0; i < NODE_COUNT; i++) {
      const depth = (nodes[i].z + 1) / 2;
      const r = 1.1 + depth * 0.9;
      ctx.beginPath();
      ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(frame);
  }

  resize();
  rafId = requestAnimationFrame(frame);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", resize);
    ro.disconnect();
    cancelAnimationFrame(rafId);
  };
}

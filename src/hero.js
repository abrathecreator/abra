import * as THREE from "three";

export function initHero(canvas) {
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 22;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x000000, 0);

  const ACCENT = new THREE.Color("#B87333");
  const SNOW = new THREE.Color("#CEC9C3");

  const NODE_COUNT = 90;
  const RANGE = { x: 28, y: 16, z: 10 };
  const LINK_DIST = 5.5;

  const nodes = [];
  const positions = new Float32Array(NODE_COUNT * 3);
  const velocities = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    const x = (Math.random() - 0.5) * RANGE.x;
    const y = (Math.random() - 0.5) * RANGE.y;
    const z = (Math.random() - 0.5) * RANGE.z;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    nodes.push({ x, y, z });
    velocities.push({
      x: (Math.random() - 0.5) * 0.012,
      y: (Math.random() - 0.5) * 0.012,
      z: (Math.random() - 0.5) * 0.008,
    });
  }

  const nodeGeom = new THREE.BufferGeometry();
  nodeGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const nodeMat = new THREE.PointsMaterial({
    color: SNOW,
    size: 0.09,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(nodeGeom, nodeMat);
  scene.add(points);

  const MAX_LINES = NODE_COUNT * 8;
  const linePositions = new Float32Array(MAX_LINES * 2 * 3);
  const lineColors = new Float32Array(MAX_LINES * 2 * 3);
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute(
    "position",
    new THREE.BufferAttribute(linePositions, 3)
  );
  lineGeom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
  });
  const lines = new THREE.LineSegments(lineGeom, lineMat);
  scene.add(lines);

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  window.addEventListener("pointermove", onMove);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();

  const tempColor = new THREE.Color();

  function animate() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    const posAttr = nodeGeom.getAttribute("position");
    for (let i = 0; i < NODE_COUNT; i++) {
      const n = nodes[i];
      const v = velocities[i];
      n.x += v.x + Math.sin(t * 0.2 + i) * 0.002;
      n.y += v.y + Math.cos(t * 0.15 + i * 0.7) * 0.002;
      n.z += v.z;

      if (n.x > RANGE.x / 2 || n.x < -RANGE.x / 2) v.x *= -1;
      if (n.y > RANGE.y / 2 || n.y < -RANGE.y / 2) v.y *= -1;
      if (n.z > RANGE.z / 2 || n.z < -RANGE.z / 2) v.z *= -1;

      posAttr.array[i * 3] = n.x;
      posAttr.array[i * 3 + 1] = n.y;
      posAttr.array[i * 3 + 2] = n.z;
    }
    posAttr.needsUpdate = true;

    let lineIndex = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (lineIndex >= MAX_LINES) break;
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < LINK_DIST) {
          const alpha = 1 - dist / LINK_DIST;
          const useAccent = (i + j) % 6 === 0;
          tempColor.copy(useAccent ? ACCENT : SNOW);

          const li = lineIndex * 6;
          linePositions[li] = a.x;
          linePositions[li + 1] = a.y;
          linePositions[li + 2] = a.z;
          linePositions[li + 3] = b.x;
          linePositions[li + 4] = b.y;
          linePositions[li + 5] = b.z;

          const ci = lineIndex * 6;
          lineColors[ci] = tempColor.r * alpha;
          lineColors[ci + 1] = tempColor.g * alpha;
          lineColors[ci + 2] = tempColor.b * alpha;
          lineColors[ci + 3] = tempColor.r * alpha;
          lineColors[ci + 4] = tempColor.g * alpha;
          lineColors[ci + 5] = tempColor.b * alpha;

          lineIndex++;
        }
      }
    }

    for (let k = lineIndex * 6; k < MAX_LINES * 6; k++) {
      linePositions[k] = 0;
      lineColors[k] = 0;
    }

    lineGeom.setDrawRange(0, lineIndex * 2);
    lineGeom.getAttribute("position").needsUpdate = true;
    lineGeom.getAttribute("color").needsUpdate = true;

    points.rotation.y = mouse.x * 0.15;
    points.rotation.x = mouse.y * 0.1;
    lines.rotation.y = mouse.x * 0.15;
    lines.rotation.x = mouse.y * 0.1;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  animate();

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    nodeGeom.dispose();
    nodeMat.dispose();
    lineGeom.dispose();
    lineMat.dispose();
  };
}

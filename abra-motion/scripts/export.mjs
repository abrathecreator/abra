/* ABRAXUS MOTION — экспорт и проверка. Без npm-зависимостей.

   node abra-motion/scripts/export.mjs

   1. Сверяет токены с сайтом: HEX-цвета — с src/style.css, контур знака —
      с public/mark.svg (и копией в assets/).
   2. Рендерит каждый кадр в headless Chrome тем же src/motion.js, что и
      предпросмотр, на прозрачном фоне, 100×100.
   3. Кодирует WEBM VP9 с альфа-каналом (yuva420p) без звука.
   4. Проверяет результат: ffprobe (кодек, размер, fps, длительность,
      отсутствие аудио), вес файла, реальную прозрачность — декодирует
      libvpx-vp9 (встроенный декодер ffmpeg альфу выбрасывает) и считает
      пиксели, — и шов цикла: разница последнего и первого кадра не больше
      обычной разницы соседних кадров.
   5. Пишет статичные PNG (кадр 0, 100 и 512 px) и export/report.json.

   Нужны Google Chrome (путь — CHROME_PATH), ffmpeg и ffprobe с libvpx. */
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOTION = join(HERE, "..");
const SITE = join(MOTION, "..");
const OUT_TG = join(MOTION, "export/telegram");
const OUT_STATIC = join(MOTION, "export/static");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9349;
const LIMIT_BYTES = 256 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tokensSrc = readFileSync(join(MOTION, "src/tokens.js"), "utf8");
const motionSrc = readFileSync(join(MOTION, "src/motion.js"), "utf8");

/* ---------- 1. сверка с сайтом ---------- */

const T = (() => {
  const ctx = {};
  new Function("globalThis", tokensSrc)(ctx);
  return ctx.AbraMotionTokens;
})();
const styleCss = readFileSync(join(SITE, "src/style.css"), "utf8");
const siteVars = { accent: "--accent", bg: "--bg", text: "--text" };
for (const [k, v] of Object.entries(siteVars)) {
  const re = new RegExp(`${v}:\\s*${T.color[k]}\\s*;`, "i");
  if (!re.test(styleCss)) throw new Error(`Токен ${k}=${T.color[k]} не совпадает с ${v} в src/style.css`);
}
for (const file of ["public/mark.svg", "abra-motion/assets/mark.svg"]) {
  const svg = readFileSync(join(SITE, file), "utf8");
  if (!svg.includes(`d="${T.mark.d}"`)) throw new Error(`Контур знака не совпадает с ${file}`);
}
console.log("✓ токены совпадают с src/style.css, контур — с public/mark.svg");

/* ---------- 2. headless Chrome ---------- */

const profile = mkdtempSync(join(tmpdir(), "abra-motion-"));
const chrome = spawn(
  CHROME,
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${DEBUG_PORT}`,
   `--user-data-dir=${profile}`, "about:blank"],
  { stdio: "ignore" }
);
const cleanup = () => {
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
};
process.on("exit", cleanup);

let target;
for (let i = 0; i < 80 && !target; i++) {
  try {
    target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })).json();
  } catch { await sleep(250); }
}
if (!target) throw new Error("Chrome не поднялся");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nextId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (!pending.has(m.id)) return;
  const { res, rej } = pending.get(m.id);
  pending.delete(m.id);
  m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
};
const send = (method, params = {}) =>
  new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval");
  return r.result.value;
};

await send("Page.enable");
await send("Page.navigate", { url: "data:text/html,<style>html,body{margin:0;background:transparent}svg{display:block}</style><body></body>" });
await sleep(300);
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
await evaluate(tokensSrc + ";" + motionSrc + ";true");
const variants = await evaluate("AbraMotion.variants.map(({key,id,name,duration,frames})=>({key,id,name,duration,frames}))");

async function shoot(svgExpr, size, file) {
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.body.innerHTML = ${svgExpr}; true`);
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });
  writeFileSync(file, Buffer.from(data, "base64"));
}

/* ---------- 3–4. кадры, WEBM, проверка ---------- */

mkdirSync(OUT_TG, { recursive: true });
mkdirSync(OUT_STATIC, { recursive: true });
const report = { generated: new Date().toISOString(), telegram: [], static: [] };
let failed = false;

for (const v of variants) {
  const dir = mkdtempSync(join(tmpdir(), `abra-${v.id}-`));
  for (let i = 0; i < v.frames; i++) {
    await shoot(`AbraMotion.frame(${JSON.stringify(v.key)}, ${i / v.frames}, 100)`, 100,
      join(dir, `f${String(i).padStart(3, "0")}.png`));
  }
  const webm = join(OUT_TG, `abraxus-${v.id}.webm`);
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(T.canvas.fps), "-i", join(dir, "f%03d.png"),
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
    "-deadline", "best", "-row-mt", "1", "-auto-alt-ref", "0", "-an", webm,
  ]);
  rmSync(dir, { recursive: true, force: true });

  const checks = verify(webm, v);
  report.telegram.push({ file: `export/telegram/abraxus-${v.id}.webm`, ...checks });
  const bad = Object.entries(checks.pass).filter(([, ok]) => !ok).map(([k]) => k);
  if (bad.length) failed = true;
  console.log(
    `${bad.length ? "✗" : "✓"} ${v.id.padEnd(11)} ${checks.width}×${checks.height} ${checks.codec} ` +
    `${checks.pixFmt} alpha_mode=${checks.alphaMode} ${checks.fps} fps ${checks.duration.toFixed(3)} с ` +
    `${(checks.bytes / 1024).toFixed(1)} КБ · прозрачных ${checks.alpha.transparentShare}% · ` +
    `шов ${checks.seam.seamDiff} ≤ ${checks.seam.maxNeighbourDiff}` + (bad.length ? `  ПРОВАЛ: ${bad.join(", ")}` : "")
  );
}

/* ---------- 5. статичные PNG ---------- */

for (const size of [100, 512]) {
  for (const v of variants) {
    const f = `abraxus-${v.id}-${size}.png`;
    await shoot(`AbraMotion.frame(${JSON.stringify(v.key)}, 0, ${size})`, size, join(OUT_STATIC, f));
    report.static.push(`export/static/${f}`);
  }
  const f = `abraxus-original-${size}.png`;
  await shoot(`AbraMotion.original(${size})`, size, join(OUT_STATIC, f));
  report.static.push(`export/static/${f}`);
}

writeFileSync(join(MOTION, "export/report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`✓ статичные PNG: ${report.static.length} → export/static, отчёт → export/report.json`);
ws.close();
cleanup();
process.exit(failed ? 1 : 0);

function verify(file, v) {
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json", file,
  ]));
  const streams = probe.streams;
  const video = streams.find((s) => s.codec_type === "video");
  const [num, den] = video.r_frame_rate.split("/").map(Number);
  const fps = num / den;
  const duration = parseFloat(probe.format.duration);
  const bytes = statSync(file).size;
  const alphaMode = video.tags?.ALPHA_MODE ?? video.tags?.alpha_mode ?? "0";

  // Декодируем libvpx-vp9 в RGBA: только он читает альфу из VP9.
  const W = 100, H = 100, FR = W * H * 4;
  const raw = execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9", "-i", file,
    "-f", "rawvideo", "-pix_fmt", "rgba", "-",
  ], { maxBuffer: 64 * 1024 * 1024 });
  const n = raw.length / FR;
  let transparent = 0, opaque = 0, partial = 0, cornersClear = true;
  for (let f = 0; f < n; f++) {
    const o = f * FR;
    for (let p = 0; p < W * H; p++) {
      const a = raw[o + p * 4 + 3];
      if (a <= 2) transparent++;
      else if (a >= 253) opaque++;
      else partial++;
    }
    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
      if (raw[o + (y * W + x) * 4 + 3] > 2) cornersClear = false;
    }
  }
  const total = n * W * H;

  // Шов: средняя разница RGBA-пикселей между кадрами (премультиплицировано
  // альфой, чтобы невидимый цвет под нулевой альфой не считался).
  const diff = (a, b) => {
    let s = 0;
    for (let p = 0; p < W * H; p++) {
      const i = a * FR + p * 4, j = b * FR + p * 4;
      const aa = raw[i + 3] / 255, ab = raw[j + 3] / 255;
      for (let c = 0; c < 3; c++) s += Math.abs(raw[i + c] * aa - raw[j + c] * ab);
      s += Math.abs(raw[i + 3] - raw[j + 3]);
    }
    return s / (W * H);
  };
  let maxNeighbour = 0;
  for (let f = 1; f < n; f++) maxNeighbour = Math.max(maxNeighbour, diff(f - 1, f));
  const seamDiff = diff(n - 1, 0);

  const audio = streams.some((s) => s.codec_type === "audio");
  const result = {
    codec: video.codec_name,
    pixFmt: video.pix_fmt,
    alphaMode,
    width: video.width,
    height: video.height,
    fps,
    frames: Number(video.nb_read_frames),
    duration,
    bytes,
    audio,
    alpha: {
      transparentShare: +((transparent / total) * 100).toFixed(1),
      opaqueShare: +((opaque / total) * 100).toFixed(1),
      partialShare: +((partial / total) * 100).toFixed(1),
      cornersClear,
    },
    seam: { seamDiff: +seamDiff.toFixed(2), maxNeighbourDiff: +maxNeighbour.toFixed(2) },
  };
  result.pass = {
    container: probe.format.format_name.includes("webm"),
    vp9: video.codec_name === "vp9",
    size100: video.width === 100 && video.height === 100,
    fps30: fps <= 30,
    duration3s: duration <= 3,
    frames: result.frames === v.frames,
    under256k: bytes <= LIMIT_BYTES,
    noAudio: !audio && streams.length === 1,
    alphaFlag: String(alphaMode) === "1",
    alphaReal: transparent / total > 0.3 && opaque > 0 && cornersClear,
    seamless: seamDiff <= maxNeighbour * 1.25 + 0.5,
  };
  return result;
}

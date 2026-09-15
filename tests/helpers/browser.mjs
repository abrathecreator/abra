/* Браузерные проверки без npm-зависимостей: vite preview отдаёт dist/,
   headless Chrome управляется через DevTools Protocol по глобальному
   WebSocket из Node ≥22. Перед запуском нужен свежий dist/ (npm test
   собирает его сам). */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./pages.mjs";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PREVIEW_PORT = 4179;
const DEBUG_PORT = 9339;
const KEY_CODES = { Tab: 9, Enter: 13, Escape: 27 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* errorHolder — общий объект между процессом и опросом waitFor: если
   spawn упал (например ENOENT — бинарник не найден), 'error' пишет сюда
   и waitFor прерывается сразу, не дожидаясь полного таймаута. Слушатель
   постоянный (.on, не .once), поэтому и ошибка после старта (процесс
   упал позже) не улетает как необработанное событие 'error'. */
async function waitFor(url, errorHolder) {
  for (let i = 0; i < 80; i++) {
    if (errorHolder.error) throw errorHolder.error;
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* сервер ещё не поднялся */
    }
    await sleep(250);
  }
  if (errorHolder.error) throw errorHolder.error;
  throw new Error(`Не дождался ответа: ${url}`);
}

/* Опрос произвольного условия с таймаутом — используется в goto() для
   ожидания готовности страницы вместо угадывания фиксированной паузой. */
async function waitForCondition(check, timeoutMs, message) {
  const start = Date.now();
  for (;;) {
    if (await check()) return;
    if (Date.now() - start >= timeoutMs) throw new Error(message);
    await sleep(100);
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function launch() {
  const errorHolder = {};

  const preview = spawn(
    "npx",
    ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore" }
  );
  preview.on("error", (err) => {
    errorHolder.error ??= new Error(`vite preview не запустился: npx (${err.code})`);
  });

  const profile = mkdtempSync(join(tmpdir(), "abra-test-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  chrome.on("error", (err) => {
    errorHolder.error ??= new Error(`Chrome не запустился: ${CHROME} (${err.code})`);
  });

  const killAll = async () => {
    /* Ждёт реального завершения процесса перед удалением файлов.
       Если процесс уже завершился, возвращается сразу. */
    const waitForProcessExit = async (proc) => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        return; /* процесс уже завершился */
      }

      proc.kill();

      try {
        /* Ждём события 'exit' с таймаутом 5 секунд */
        await withTimeout(
          new Promise((resolve) => proc.once("exit", resolve)),
          5000,
          `Процесс не завершился за 5 секунд`
        );
      } catch {
        /* Таймаут — отправляем SIGKILL и даём время на выход */
        proc.kill("SIGKILL");
        await sleep(200);
      }
    };

    await waitForProcessExit(chrome);
    await waitForProcessExit(preview);

    /* Удаляем профиль с повторами на случай остаточных файлов */
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
      /* Остаток файлов не критичен */
    }
  };

  try {
    await waitFor(`http://localhost:${PREVIEW_PORT}/`, errorHolder);
    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`, errorHolder);
  } catch (err) {
    /* что бы ни пошло не так на старте (таймаут, занятый порт, ENOENT) —
       не оставлять висящие процессы, пробрасываем исходную ошибку дальше */
    await killAll();
    throw err;
  }

  return {
    newPage: () => openPage(),
    close: killAll,
  };
}

async function openPage() {
  const target = await (
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const page = {
    async goto(path, { width = 1440, height = 900, reducedMotion = false, js = true } = {}) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" },
        ],
      });
      await send("Emulation.setScriptExecutionDisabled", { value: !js });
      await send("Page.navigate", { url: `http://localhost:${PREVIEW_PORT}${path}` });
      await waitForCondition(
        () => page.eval("document.readyState === 'complete'"),
        10000,
        `Таймаут ожидания document.readyState === "complete": ${path}`
      );
      await withTimeout(
        page.eval("document.fonts.ready.then(() => true)"),
        10000,
        `Таймаут ожидания document.fonts.ready: ${path}`
      );
      /* GSAP-таймлайнам входа всё ещё нужна пауза после готовности документа */
      await sleep(1200);
    },
    async eval(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || "Ошибка в eval");
      }
      return res.result.value;
    },
    async hover(selector) {
      const box = await page.eval(`(() => {
        const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
      await sleep(500);
    },
    async press(key) {
      for (const type of ["rawKeyDown", "keyUp"]) {
        await send("Input.dispatchKeyEvent", {
          type,
          key,
          code: key,
          windowsVirtualKeyCode: KEY_CODES[key],
          nativeVirtualKeyCode: KEY_CODES[key],
        });
      }
      await sleep(80);
    },
    wait: sleep,
    close() {
      ws.close();
    },
  };
  return page;
}

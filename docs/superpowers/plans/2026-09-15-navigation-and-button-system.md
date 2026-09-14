# Навигация без якорей, система кнопок и карточки — план внедрения

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать якорную навигацию, перенести навигацию телефона в нижнюю панель со шторкой «Написать», ввести четырёхуровневую систему кнопок на мотиве скобок и заменить скруглённые карточки метками по углам.

**Architecture:** Многостраничный Vite-сайт без шаблонизатора: разметка шапки, панели и шторки вручную дублируется в 10 HTML-файлах, стили — в одном `src/style.css`, поведение — в `src/nav.js` и `src/contact-modal.js`. Состояние «панель скрыта» выносится в крошечный модуль `src/tabbar-state.js`, чтобы `nav.js` и `contact-modal.js` не импортировали друг друга по кругу. Проверки — тесты на встроенном `node:test`: статические (читают HTML/CSS) и браузерные (headless Chrome через DevTools Protocol, без npm-зависимостей).

**Tech Stack:** Vite 6, vanilla JS (ES-модули), GSAP 3 (не трогаем), CSS custom properties, Node ≥22 (`node:test`, глобальные `fetch` и `WebSocket`), Google Chrome.

**Spec:** `docs/superpowers/specs/2026-09-15-navigation-and-button-system-design.md` — читать вместе с этим планом. Визуальный референс: `~/Downloads/abra-bottom-nav.html`.

## Global Constraints

- Новые npm-зависимости запрещены: в `package.json` остаются только `gsap` (prod) и `vite` (dev). Тесты — только встроенные модули Node и локальный Chrome.
- Новый цвет не вводится. Единственный новый токен — `--border-surface: rgba(206, 201, 195, 0.16)` (это `rgba()` от `--text`).
- Кривая всех движений — `cubic-bezier(0.2, 0.8, 0.2, 1)`. Тайминги из спецификации: 320 мс (скобки, подчёркивание), 40 мс (задержка роста рамки), 90 мс (нажатие), 280 мс (панель), 300 мс (шторка), 240 мс (затемнение), 360 мс + 40 мс (метки карточек).
- Нижняя панель — только на `max-width: 720px`.
- Внутренние ссылки — только через `%BASE_URL%` (`%BASE_URL%`, `%BASE_URL%cases`, `%BASE_URL%articles`, `%BASE_URL%#contact`).
- Разметка шапки, панели и шторки одинакова во всех 10 файлах, кроме `aria-current` и варианта кнопки «Оставить заявку».
- Тексты четырёх кнопок не меняются: «Написать», «Разобрать систему», «Перейти к форме», «Отправить заявку».
- Формат меток разделов `[ .Название ]`, тайминги блока SECTION ICONS, `case-template.html`, `server/` — не трогать.
- Коммиты — на английском, по одному на задачу; комментарии в коде — по-русски.
- Пуш в `main` запускает деплой на прод. **Не пушить и не сливать в `main` без явного «да» владельца** в конце каждого этапа.

## Страницы

| Файл | Путь в тестах | Раздел в меню | `aria-current` | Модалка заявки |
|---|---|---|---|---|
| `index.html` | `/` | Главная | `page` | есть |
| `privacy.html` | `/privacy.html` | — | — | нет |
| `terms.html` | `/terms.html` | — | — | нет |
| `consent.html` | `/consent.html` | — | — | нет |
| `404.html` | `/404.html` | — | — | нет |
| `case-zhbi.html` | `/case-zhbi.html` | Кейсы | `true` | есть |
| `unit-economics.html` | `/unit-economics.html` | — | — | есть |
| `growth-system.html` | `/growth-system.html` | Статьи | `true` | есть |
| `cases.html` | `/cases.html` | Кейсы | `page` | нет |
| `articles.html` | `/articles.html` | Статьи | `page` | нет |

В тестах страницы открываются по имени файла с `.html` — так `vite preview` гарантированно отдаёт нужный файл, без догадок про чистые URL. Программная прокрутка в тестах — только `window.scrollTo({ top, behavior: "instant" })`: на сайте включён `scroll-behavior: smooth`, и обычный `scrollTo` не успеет за ожиданием.

## Карта файлов

| Файл | Что делает | Задачи |
|---|---|---|
| `package.json` | + скрипт `test` | 1 |
| `tests/helpers/pages.mjs` | Таблица страниц, чтение файлов проекта | 1 |
| `tests/helpers/browser.mjs` | Запуск `vite preview` + headless Chrome, API страницы | 1 |
| `tests/smoke.test.mjs` | Нет горизонтального переполнения: 10 страниц × 6 ширин | 1 |
| `tests/buttons.test.mjs` | Уровни 2 и 3: компактные скобки, подчёркивания | 2, 3 |
| `tests/navigation.test.mjs` | viewport, шапка, панель, cookie, hero, шторка | 4–8 |
| `tests/cards.test.mjs` | Метки по углам у карточек | 10 |
| `src/style.css` | Все стили | 2–8, 10 |
| `src/tabbar-state.js` (новый) | Причины скрытия панели: `setTabbarSuppressed(reason, on)` | 6, 8 |
| `src/nav.js` | Меню «Написать» (десктоп), автоскрытие панели, шторка | 6, 8 |
| `src/contact-modal.js` | + `openContactModal(opener)`, скрытие панели при модалке | 8 |
| 10 HTML-файлов | Шапка, панель, шторка, viewport, cookie-кнопка | 2, 4, 5, 6, 8 |
| `cases.html`, `articles.html` | Метки внутри карточек | 10 |
| `CLAUDE.md` | Документация навигации, кнопок, карточек | 9, 10 |

## Порядок и этапы

- **Этап A — система кнопок:** задачи 1–3. В конце — показать владельцу, слить и выкатить только после «да».
- **Этап B — навигация:** задачи 4–9. То же.
- **Этап C — карточки:** задача 10. То же.

---

### Task 0: Ветка

- [ ] **Step 1: Убедиться, что дерево чистое, и завести ветку**

```bash
cd /Users/abracadabra/Documents/abrasite
git status --short
git checkout -b feat/nav-button-system
```

Expected: `git status --short` показывает только `?? docs/` (спецификация и этот план) или ничего; если есть чужие незакоммиченные правки в `index.html`, `src/` — остановиться и спросить владельца.

- [ ] **Step 2: Закоммитить спецификацию и план**

```bash
git add docs/superpowers/specs/2026-09-15-navigation-and-button-system-design.md docs/superpowers/plans/2026-09-15-navigation-and-button-system.md
git commit -m "Add the navigation and button system spec and implementation plan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 1: Тестовая обвязка без зависимостей

**Files:**
- Modify: `package.json` (блок `scripts`)
- Create: `tests/helpers/pages.mjs`
- Create: `tests/helpers/browser.mjs`
- Create: `tests/smoke.test.mjs`

**Interfaces:**
- Produces:
  - `PAGES` — массив `{ file, path, section, current, modal }` (`section`: `"home" | "cases" | "articles" | null`, `current`: `"page" | "true" | null`).
  - `read(relPath): string` — содержимое файла проекта.
  - `WIDTHS` — `[1440, 1024, 768, 390, 375, 320]`.
  - `launch(): Promise<{ newPage(): Promise<Page>, close(): Promise<void> }>`.
  - `Page`: `goto(path, { width=1440, height=900, reducedMotion=false, js=true })`, `eval(expression): Promise<any>`, `hover(selector)`, `press(key)` для `"Tab" | "Escape" | "Enter"`, `wait(ms)`, `close()`.

- [ ] **Step 1: Добавить скрипт `test` в `package.json`**

Заменить блок `scripts` на:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vite build --logLevel error && node --test --test-concurrency=1 tests/"
  },
```

`--test-concurrency=1` обязателен: все браузерные тесты используют одни и те же порты.

- [ ] **Step 2: Создать `tests/helpers/pages.mjs`**

```js
/* Таблица страниц и чтение файлов проекта — общие для всех тестов.
   Пути с .html: vite preview отдаёт файл по точному имени. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const read = (relPath) => readFileSync(join(ROOT, relPath), "utf8");

export const WIDTHS = [1440, 1024, 768, 390, 375, 320];

export const PAGES = [
  { file: "index.html", path: "/", section: "home", current: "page", modal: true },
  { file: "privacy.html", path: "/privacy.html", section: null, current: null, modal: false },
  { file: "terms.html", path: "/terms.html", section: null, current: null, modal: false },
  { file: "consent.html", path: "/consent.html", section: null, current: null, modal: false },
  { file: "404.html", path: "/404.html", section: null, current: null, modal: false },
  { file: "case-zhbi.html", path: "/case-zhbi.html", section: "cases", current: "true", modal: true },
  { file: "unit-economics.html", path: "/unit-economics.html", section: null, current: null, modal: true },
  { file: "growth-system.html", path: "/growth-system.html", section: "articles", current: "true", modal: true },
  { file: "cases.html", path: "/cases.html", section: "cases", current: "page", modal: false },
  { file: "articles.html", path: "/articles.html", section: "articles", current: "page", modal: false },
];
```

- [ ] **Step 3: Создать `tests/helpers/browser.mjs`**

```js
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

async function waitFor(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* сервер ещё не поднялся */
    }
    await sleep(250);
  }
  throw new Error(`Не дождался ответа: ${url}`);
}

export async function launch() {
  const preview = spawn(
    "npx",
    ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore" }
  );
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
  await waitFor(`http://localhost:${PREVIEW_PORT}/`);
  await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`);

  return {
    newPage: () => openPage(),
    async close() {
      chrome.kill();
      preview.kill();
      await sleep(200);
      rmSync(profile, { recursive: true, force: true });
    },
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
```

- [ ] **Step 4: Создать `tests/smoke.test.mjs`**

```js
/* Базовая страховка всего плана: ни одна страница ни на одной ширине
   не шире экрана. Должен проходить до любых правок и после каждой. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, WIDTHS } from "./helpers/pages.mjs";

let browser;
let page;

before(async () => {
  browser = await launch();
  page = await browser.newPage();
});

after(async () => {
  page.close();
  await browser.close();
});

for (const { path } of PAGES) {
  test(`нет горизонтального переполнения: ${path}`, async () => {
    for (const width of WIDTHS) {
      await page.goto(path, { width, height: 800 });
      const { scroll, client } = await page.eval(
        "({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })"
      );
      assert.equal(scroll, client, `${path} на ${width}px: scrollWidth ${scroll} ≠ ${client}`);
    }
  });
}
```

- [ ] **Step 5: Запустить базовый прогон**

Run: `npm test`

Expected: сборка без ошибок, `# pass 10`, `# fail 0`. Если какая-то страница уже переполняется — остановиться и сообщить владельцу: это существующий баг, а не часть плана.

- [ ] **Step 6: Commit**

```bash
git add package.json tests/
git commit -m "Add dependency-free page and browser checks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Этап A — система кнопок

### Task 2: Уровень 2 — компактные скобки у «Написать» и «Хорошо»

**Files:**
- Create: `tests/buttons.test.mjs`
- Modify: все 10 HTML — кнопка `.nav__cta` в шапке и `.cookie-banner__accept` в cookie-баннере
- Modify: `src/style.css` — блоки `.nav__cta` (~стр. 231–246), общий список `:focus-visible` (~373–382), `.cookie-banner__accept` (~1923–1942), `@media (max-width: 560px)` у cookie (~1950–1960), новый блок после `.abra-cta[data-state="loading"]` (~855)

**Interfaces:**
- Consumes: `launch`, `PAGES`, `read` из Task 1.
- Produces: CSS-модификатор `.abra-cta--compact` — только для уровня 2; кнопки в нижней панели и шторке (задачи 6 и 8) — обычная `.abra-cta` уровня 1. Классы-хуки `nav__cta` и `cookie-banner__accept` остаются на тех же элементах.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/buttons.test.mjs`:

```js
/* Система кнопок: уровень 2 (компактные скобки) и уровень 3 (подчёркивания). */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, read } from "./helpers/pages.mjs";

describe("уровень 2 — разметка", () => {
  for (const { file } of PAGES) {
    test(`${file}: «Написать» и «Хорошо» — компактные скобки`, () => {
      const html = read(file);
      assert.match(html, /class="abra-cta abra-cta--compact nav__cta"/);
      assert.match(html, /class="abra-cta abra-cta--compact cookie-banner__accept"/);
    });
  }
});

describe("уровень 2 — поведение", () => {
  let browser;
  let page;
  before(async () => {
    browser = await launch();
    page = await browser.newPage();
  });
  after(async () => {
    page.close();
    await browser.close();
  });

  test("«Написать» в шапке: 44px, при наведении уголки только расходятся", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const rest = await page.eval(`(() => {
      const btn = document.querySelector(".nav__cta");
      return {
        height: btn.getBoundingClientRect().height,
        corners: btn.querySelectorAll(".abra-cta__corner").length,
        width: getComputedStyle(btn.querySelector(".abra-cta__corner--tl")).width,
      };
    })()`);
    assert.equal(rest.height, 44);
    assert.equal(rest.corners, 4);
    assert.equal(rest.width, "8px");

    await page.hover(".nav__cta");
    const hovered = await page.eval(`(() => {
      const cs = getComputedStyle(document.querySelector(".nav__cta .abra-cta__corner--tl"));
      return { width: cs.width, transform: cs.transform };
    })()`);
    assert.equal(hovered.width, "8px", "компактные скобки не строят рамку");
    assert.equal(hovered.transform, "matrix(1, 0, 0, 1, -3, 0)");
  });

  test("меню «Написать» по-прежнему раскрывается", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const opened = await page.eval(`(() => {
      document.querySelector(".nav__cta").click();
      return !document.getElementById("nav-contact-menu").hidden;
    })()`);
    assert.equal(opened, true);
  });

  test("«Хорошо»: 44px и по-прежнему закрывает баннер", async () => {
    await page.goto("/cases.html", { width: 390, height: 844 });
    await page.eval("localStorage.clear()");
    await page.goto("/cases.html", { width: 390, height: 844 });
    const height = await page.eval(
      `document.querySelector(".cookie-banner__accept").getBoundingClientRect().height`
    );
    assert.equal(height, 44);
    await page.eval(`document.querySelector(".cookie-banner__accept").click()`);
    await page.wait(500);
    const visibility = await page.eval(
      `getComputedStyle(document.getElementById("cookie-banner")).visibility`
    );
    assert.equal(visibility, "hidden");
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/buttons.test.mjs`

Expected: FAIL — `The input did not match the regular expression /class="abra-cta abra-cta--compact nav__cta"/`.

- [ ] **Step 3: Заменить разметку кнопок во всех 10 файлах**

Run из корня проекта:

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";

const files = ["index.html", "privacy.html", "terms.html", "consent.html", "404.html",
  "case-zhbi.html", "unit-economics.html", "growth-system.html", "cases.html", "articles.html"];

const frame = (pad) => [
  `${pad}<span class="abra-cta__frame" aria-hidden="true">`,
  `${pad}  <span class="abra-cta__corner abra-cta__corner--tl"></span>`,
  `${pad}  <span class="abra-cta__corner abra-cta__corner--tr"></span>`,
  `${pad}  <span class="abra-cta__corner abra-cta__corner--bl"></span>`,
  `${pad}  <span class="abra-cta__corner abra-cta__corner--br"></span>`,
  `${pad}</span>`,
].join("\n");

const navOld = `        <button
          class="nav__cta"
          type="button"
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="nav-contact-menu"
        >
          Написать
        </button>`;
const navNew = `        <button
          class="abra-cta abra-cta--compact nav__cta"
          type="button"
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="nav-contact-menu"
        >
${frame("          ")}
          <span class="abra-cta__label">Написать</span>
        </button>`;

const cookieOld = `      <button class="cookie-banner__accept" type="button">Хорошо</button>`;
const cookieNew = `      <button class="abra-cta abra-cta--compact cookie-banner__accept" type="button">
${frame("        ")}
        <span class="abra-cta__label">Хорошо</span>
      </button>`;

for (const file of files) {
  let html = readFileSync(file, "utf8");
  for (const [before, after, name] of [[navOld, navNew, "nav__cta"], [cookieOld, cookieNew, "cookie"]]) {
    const count = html.split(before).length - 1;
    if (count !== 1) throw new Error(`${file}: ${name} найден ${count} раз, ожидался 1`);
    html = html.replace(before, after);
  }
  writeFileSync(file, html);
  console.log("ok", file);
}
EOF
```

Expected: десять строк `ok …`. Если скрипт упал на каком-то файле — разметка там отличается; открыть файл и привести блок к виду из `privacy.html`, потом перезапустить.

- [ ] **Step 4: CSS — убрать стили пилюль**

В `src/style.css`:

1. Удалить целиком блоки `.nav__cta { … }` и `.nav__cta:hover { … }` (сразу после `.nav__contact { position: relative; }`).
2. В общем правиле фокуса (начинается с комментария «Браузерное focus-visible кольцо…») удалить строку `.nav__cta:focus-visible,` — у `.abra-cta` своя обводка на `.abra-cta__frame`.
3. Заменить блоки `.cookie-banner__accept { … }` и `.cookie-banner__accept:hover, .cookie-banner__accept:focus-visible { … }` одним правилом:

```css
.cookie-banner__accept {
  flex: 0 0 auto;
}
```

4. В `@media (max-width: 560px)` рядом с `.cookie-banner { justify-content: flex-start; … }` удалить правило `.cookie-banner__accept { width: 100%; text-align: center; }` — скобки на всю ширину экрана разъезжаются по краям.

- [ ] **Step 5: CSS — добавить модификатор**

Сразу после блока `.abra-cta[data-state="loading"] { … }` и перед `@media (max-width: 900px)` вставить:

```css
/* Уровень 2 системы кнопок — компактные скобки для второстепенных
   действий («Написать» в шапке, «Хорошо» в cookie-баннере). Уголки
   только расходятся, рамку не строят — главную кнопку не перебивают.
   Два класса в селекторах намеренно: иначе размеры перебьёт .abra-cta
   внутри @media (max-width: 900px), а ширину — правила hover/active. */
.abra-cta.abra-cta--compact {
  --cta-h: 44px;
  --cta-pad-x: 18px;
  --cta-bracket-span: 26px;
  --cta-corner-h: 9px;
  --cta-corner-w: 8px;
  --cta-shift: 3px;
}

.abra-cta.abra-cta--compact .abra-cta__label {
  font-size: 12px;
}

@media (hover: hover) and (pointer: fine) {
  .abra-cta.abra-cta--compact:hover .abra-cta__corner,
  .abra-cta.abra-cta--compact:focus-visible .abra-cta__corner {
    width: var(--cta-corner-w);
  }
}

@media (hover: none) {
  .abra-cta.abra-cta--compact:active .abra-cta__corner {
    width: var(--cta-corner-w);
  }
}
```

- [ ] **Step 6: Убедиться, что тесты проходят**

Run: `npx vite build --logLevel error && node --test tests/buttons.test.mjs tests/smoke.test.mjs`

Expected: `# fail 0`.

- [ ] **Step 7: Посмотреть глазами**

Запустить дев-сервер (`preview_start` с именем `abra-dev` или `npm run dev`), открыть `/cases` на 1440 и навести курсор на «Написать»; открыть `/` на 390 в приватном окне и посмотреть cookie-баннер. Ожидаемо: скобки вместо овала, при наведении уголки расходятся на 3px, рамка не собирается.

- [ ] **Step 8: Commit**

```bash
git add tests/buttons.test.mjs src/style.css index.html privacy.html terms.html consent.html 404.html case-zhbi.html unit-economics.html growth-system.html cases.html articles.html
git commit -m "Turn the header and cookie buttons into compact brackets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Уровень 3 — подчёркивание у пунктов шапки и в оглавлении

**Files:**
- Modify: `tests/buttons.test.mjs` (новый `describe` в конце файла)
- Modify: `src/style.css` — блоки `.nav__links a` и `.nav__links a:hover` (~стр. 217–225), блоки `.case__toc-link`, `.case__toc-link:hover`, `.case__toc-link.is-active` (~3384–3404)

**Interfaces:**
- Consumes: `launch` из Task 1; класс `.is-active`, который уже ставит `src/article.js`.
- Produces: правило `.nav__links a[aria-current]` (подчёркнут, `--accent`) — атрибут расставит Task 5.

- [ ] **Step 1: Дописать падающий тест**

В конец `tests/buttons.test.mjs`:

```js
describe("уровень 3 — подчёркивания", () => {
  let browser;
  let page;
  before(async () => {
    browser = await launch();
    page = await browser.newPage();
  });
  after(async () => {
    page.close();
    await browser.close();
  });

  const afterTransform = (selector) =>
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)}), "::after").transform`;

  test("пункт шапки: в покое линии нет, при наведении — на всю ширину", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const link = ".nav__links a:nth-child(2)";
    assert.equal(await page.eval(afterTransform(link)), "matrix(0, 0, 0, 1, 0, 0)");
    await page.hover(link);
    assert.equal(await page.eval(afterTransform(link)), "matrix(1, 0, 0, 1, 0, 0)");
  });

  test("оглавление статьи: активный пункт подчёркнут, левой полосы нет", async () => {
    await page.goto("/growth-system.html", { width: 1440, height: 900 });
    await page.eval(`window.scrollTo({ top: 1600, behavior: "instant" })`); // на сайте scroll-behavior: smooth
    await page.wait(700);
    const active = await page.eval(`(() => {
      const link = document.querySelector(".case__toc-link.is-active");
      if (!link) return null;
      const cs = getComputedStyle(link);
      return { size: cs.backgroundSize, border: cs.borderLeftWidth };
    })()`);
    assert.ok(active, "в оглавлении есть активный пункт");
    assert.equal(active.size, "100% 1px");
    assert.equal(active.border, "0px");
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/buttons.test.mjs`

Expected: FAIL в «пункт шапки» (`::after` у ссылки сейчас нет, transform — `none`) и в «оглавление» (`backgroundSize` не `100% 1px`).

- [ ] **Step 3: CSS — пункты шапки**

Заменить блоки `.nav__links a { … }` и `.nav__links a:hover { … }` на:

```css
.nav__links a {
  position: relative;
  opacity: 0.75;
  transition: opacity 0.2s ease, color 0.2s ease;
}

/* Уровень 3 системы кнопок — подчёркивание растёт слева, как у
   .abra-link. Только на десктопной шапке: на телефоне ссылки шапки
   не показываются. */
@media (min-width: 721px) {
  .nav__links a::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -4px;
    height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .nav__links a:hover,
  .nav__links a:focus-visible {
    opacity: 1;
  }

  .nav__links a:hover::after,
  .nav__links a:focus-visible::after,
  .nav__links a[aria-current]::after {
    transform: scaleX(1);
  }

  .nav__links a[aria-current] {
    opacity: 1;
    color: var(--accent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav__links a::after {
    transition: none;
  }
}
```

- [ ] **Step 4: CSS — оглавление статьи**

Заменить блоки `.case__toc-link { … }`, `.case__toc-link:hover { … }`, `.case__toc-link.is-active { … }` на:

```css
.case__toc-link {
  display: inline-block;
  padding: 6px 0;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text);
  opacity: 0.7;
  /* Уровень 3 системы кнопок: вместо левой полосы — подчёркивание под
     текстом, растёт слева. Фоном — без псевдоэлемента и без position. */
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 calc(100% - 4px);
  background-size: 0 1px;
  transition: opacity 0.2s ease, color 0.2s ease,
    background-size 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.case__toc-link:hover {
  opacity: 1;
}

.case__toc-link.is-active {
  color: var(--accent);
  opacity: 1;
  background-size: 100% 1px;
}

@media (prefers-reduced-motion: reduce) {
  .case__toc-link {
    transition: none;
  }
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`

Expected: `# fail 0` по всем файлам `tests/`.

- [ ] **Step 6: Commit**

```bash
git add tests/buttons.test.mjs src/style.css
git commit -m "Underline the current and hovered links in the header and article contents

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Сдача этапа A**

Показать владельцу, что изменилось (шапка на 1440, cookie-баннер на 390, оглавление статьи), и спросить разрешение на выкладку. **Без явного «да» — не сливать и не пушить.** После «да»:

```bash
git checkout main
git merge --ff-only feat/nav-button-system
git push origin main
gh run watch "$(gh run list --workflow deploy-vps.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
npm run build >/dev/null && ls dist/assets/ | grep '^main-'
curl -s https://a-bra.ru/ | grep -o 'assets/main-[^"]*\.js'
git checkout feat/nav-button-system
```

Expected: прогон деплоя успешен, имя `main-*.js` на проде совпадает с локальной сборкой.

---

## Этап B — навигация

### Task 4: viewport-fit, безопасная зона и новые токены

**Files:**
- Create: `tests/navigation.test.mjs`
- Modify: все 10 HTML — `<meta name="viewport">`
- Modify: `src/style.css` — `:root` (~стр. 31–46), блок `.nav` (~159–178)

**Interfaces:**
- Consumes: `launch`, `PAGES`, `read` из Task 1.
- Produces: токены `--border-surface` и `--nav-h` (с `env(safe-area-inset-top)`); хелпер `withBrowser()` в `tests/navigation.test.mjs`, которым пользуются задачи 5–8.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/navigation.test.mjs`:

```js
/* Навигация: viewport и безопасная зона, шапка, нижняя панель, cookie,
   hero, шторка «Написать». */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, read } from "./helpers/pages.mjs";

/* Один браузер на describe: before/after внутри текущего блока. */
function withBrowser() {
  const ctx = {};
  before(async () => {
    ctx.browser = await launch();
    ctx.page = await ctx.browser.newPage();
  });
  after(async () => {
    ctx.page.close();
    await ctx.browser.close();
  });
  return ctx;
}

describe("viewport и безопасная зона", () => {
  for (const { file } of PAGES) {
    test(`${file}: viewport-fit=cover`, () => {
      assert.ok(
        read(file).includes(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />'
        )
      );
    });
  }

  test("токены --border-surface и --nav-h с безопасной зоной", () => {
    const css = read("src/style.css");
    assert.ok(css.includes("--border-surface: rgba(206, 201, 195, 0.16);"));
    assert.ok(css.includes("--nav-h: calc(84px + env(safe-area-inset-top));"));
  });

  describe("в браузере", () => {
    const ctx = withBrowser();

    test("на обычном экране отступы шапки и якорей не изменились", async () => {
      await ctx.page.goto("/", { width: 1440 });
      const got = await ctx.page.eval(`(() => {
        const nav = getComputedStyle(document.querySelector(".nav"));
        return {
          top: nav.paddingTop,
          left: nav.paddingLeft,
          margin: getComputedStyle(document.getElementById("insight")).scrollMarginTop,
        };
      })()`);
      assert.equal(got.top, "20px");
      assert.equal(got.left, "56px");
      assert.equal(got.margin, "100px");
    });
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: FAIL в тестах `viewport-fit=cover` и «токены»; тест «в браузере» — PASS (он страхует от регресса).

- [ ] **Step 3: viewport во всех 10 файлах**

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
const files = ["index.html", "privacy.html", "terms.html", "consent.html", "404.html",
  "case-zhbi.html", "unit-economics.html", "growth-system.html", "cases.html", "articles.html"];
const before = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
const after = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />';
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const count = html.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: viewport найден ${count} раз`);
  writeFileSync(file, html.replace(before, after));
  console.log("ok", file);
}
EOF
```

- [ ] **Step 4: CSS — токены**

В `:root` заменить строку `--nav-h: 84px;` на:

```css
  /* Высота шапки вместе с безопасной зоной выреза iPhone — на неё
     опираются scroll-margin-top и липкие панели. */
  --nav-h: calc(84px + env(safe-area-inset-top));
```

и сразу после строки `--border-control: …;` добавить:

```css
  --border-surface: rgba(206, 201, 195, 0.16); /* края плавающих плашек: нижняя панель, шторка, cookie-карточка */
```

- [ ] **Step 5: CSS — отступы шапки**

В блоке `.nav { … }` заменить `padding: 20px var(--gutter);` на:

```css
  /* viewport-fit=cover пускает страницу под вырез iPhone — отступы
     шапки учитывают безопасную зону; на обычных экранах env() = 0. */
  padding: calc(20px + env(safe-area-inset-top))
    max(var(--gutter), env(safe-area-inset-right)) 20px
    max(var(--gutter), env(safe-area-inset-left));
```

- [ ] **Step 6: Убедиться, что тесты проходят**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs tests/smoke.test.mjs`

Expected: `# fail 0`.

- [ ] **Step 7: Commit**

```bash
git add tests/navigation.test.mjs src/style.css index.html privacy.html terms.html consent.html 404.html case-zhbi.html unit-economics.html growth-system.html cases.html articles.html
git commit -m "Extend the page under the iPhone notch and keep the header clear of it

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Шапка — три ссылки на всех страницах и текущий раздел

**Files:**
- Modify: `tests/navigation.test.mjs` (новый `describe` в конце)
- Modify: все 10 HTML — блок `<nav class="nav__links" id="nav-links">…</nav>`

**Interfaces:**
- Consumes: `withBrowser()` из Task 4; правило `.nav__links a[aria-current]` из Task 3; `PAGES[].section` и `PAGES[].current` из Task 1.
- Produces: атрибут `aria-current` на ссылке текущего раздела — Task 6 повторяет ту же таблицу во вкладках панели.

- [ ] **Step 1: Дописать падающий тест**

В конец `tests/navigation.test.mjs`:

```js
const SECTION_INDEX = { home: 0, cases: 1, articles: 2 };
const NAV_LINKS = [
  ["%BASE_URL%", "Главная"],
  ["%BASE_URL%cases", "Кейсы"],
  ["%BASE_URL%articles", "Статьи"],
];

describe("шапка — три ссылки и текущий раздел", () => {
  for (const { file, section, current } of PAGES) {
    test(`${file}: разметка`, () => {
      const block = read(file).match(/<nav class="nav__links"[^>]*>([\s\S]*?)<\/nav>/);
      assert.ok(block, "есть .nav__links");
      const links = [...block[1].matchAll(/<a href="([^"]+)"(?: aria-current="([^"]+)")?>([^<]+)<\/a>/g)];
      assert.deepEqual(
        links.map((m) => [m[1], m[3]]),
        NAV_LINKS,
        "Главная · Кейсы · Статьи, без якорей"
      );
      links.forEach((m, i) => {
        const expected = section && SECTION_INDEX[section] === i ? current : undefined;
        assert.equal(m[2], expected, `aria-current у «${m[3]}»`);
      });
    });
  }

  describe("в браузере", () => {
    const ctx = withBrowser();
    for (const { path, section, current } of PAGES) {
      test(`${path}: текущий пункт подчёркнут`, async () => {
        await ctx.page.goto(path, { width: 1440 });
        const got = await ctx.page.eval(`(() => {
          const links = [...document.querySelectorAll(".nav__links a")];
          const cur = document.querySelector(".nav__links a[aria-current]");
          return {
            count: links.length,
            index: cur ? links.indexOf(cur) : -1,
            value: cur ? cur.getAttribute("aria-current") : null,
            line: cur ? getComputedStyle(cur, "::after").transform : null,
            color: cur ? getComputedStyle(cur).color : null,
          };
        })()`);
        assert.equal(got.count, 3);
        if (!section) {
          assert.equal(got.index, -1);
          return;
        }
        assert.equal(got.index, SECTION_INDEX[section]);
        assert.equal(got.value, current);
        assert.equal(got.line, "matrix(1, 0, 0, 1, 0, 0)");
        assert.equal(got.color, "rgb(184, 115, 51)");
      });
    }
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: FAIL — на `index.html` ссылки-якоря вместо трёх страниц; на остальных нет `aria-current`.

- [ ] **Step 3: Проверить, что якоря в меню никто не использует из JS**

Run: `grep -rn 'nav__links' src/ --include=*.js`

Expected: совпадения только в `src/nav.js` (мобильное меню, будет удалено в Task 6). Если найдётся код в `src/main.js`, завязанный на `.nav__links a[href^="#"]`, — остановиться и сообщить.

- [ ] **Step 4: Заменить блок ссылок во всех 10 файлах**

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";

const pages = [
  ["index.html", 0, "page"], ["privacy.html", null, null], ["terms.html", null, null],
  ["consent.html", null, null], ["404.html", null, null], ["case-zhbi.html", 1, "true"],
  ["unit-economics.html", null, null], ["growth-system.html", 2, "true"],
  ["cases.html", 1, "page"], ["articles.html", 2, "page"],
];
const links = [["%BASE_URL%", "Главная"], ["%BASE_URL%cases", "Кейсы"], ["%BASE_URL%articles", "Статьи"]];

for (const [file, currentIndex, currentValue] of pages) {
  const html = readFileSync(file, "utf8");
  const pattern = /      <nav class="nav__links" id="nav-links">[\s\S]*?<\/nav>/g;
  const count = (html.match(pattern) || []).length;
  if (count !== 1) throw new Error(`${file}: .nav__links найден ${count} раз`);
  const items = links.map(([href, label], i) => {
    const current = i === currentIndex ? ` aria-current="${currentValue}"` : "";
    return `        <a href="${href}"${current}>${label}</a>`;
  });
  const block = [`      <nav class="nav__links" id="nav-links">`, ...items, `      </nav>`].join("\n");
  writeFileSync(file, html.replace(pattern, block));
  console.log("ok", file);
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs tests/smoke.test.mjs`

Expected: `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add tests/navigation.test.mjs index.html privacy.html terms.html consent.html 404.html case-zhbi.html unit-economics.html growth-system.html cases.html articles.html
git commit -m "Link the header to pages instead of homepage anchors and mark the current section

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Нижняя панель на телефоне, гамбургер уходит

**Files:**
- Create: `src/tabbar-state.js`
- Modify: `src/nav.js` (переписывается целиком)
- Modify: `src/style.css` — удалить блок гамбургера (от комментария «Гамбургер — виден только ≤720px…» до конца следующего за ним `@media (max-width: 720px) { … }`), убрать `.nav__menu-toggle:focus-visible,` из общего правила фокуса, добавить блок TABBAR
- Modify: все 10 HTML — удалить `<button class="nav__menu-toggle">`, убрать ` id="nav-links"`, вставить `<nav class="tabbar">` сразу после `</header>`
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `withBrowser()`, `SECTION_INDEX` из задач 4–5; токен `--border-surface` из Task 4; таблица `PAGES` из Task 1.
- Produces:
  - `src/tabbar-state.js`: `export function setTabbarSuppressed(reason: "field" | "sheet" | "modal", on: boolean): void` — ставит/снимает класс `is-suppressed` на `.tabbar`, синхронно.
  - `src/nav.js`: `export function initNav(): void` (сигнатура прежняя).
  - Разметка: `.tabbar`, `.tabbar__tab`, `.tabbar__label`, `.tabbar__cta` (ссылка `%BASE_URL%#contact`). Классы `is-hidden` (скрыта прокруткой) и `is-suppressed` (скрыта по причине).

- [ ] **Step 1: Дописать падающий тест**

В конец `tests/navigation.test.mjs`:

```js
const TAB_LINKS = [
  ["%BASE_URL%", "Главная"],
  ["%BASE_URL%cases", "Кейсы"],
  ["%BASE_URL%articles", "Статьи"],
];

const tabbarBlock = (html) => {
  const m = html.match(/    <nav class="tabbar" aria-label="Разделы сайта">[\s\S]*?\n    <\/nav>/);
  return m ? m[0] : null;
};

describe("нижняя панель — разметка", () => {
  const reference = tabbarBlock(read("index.html"))?.replace(/ aria-current="[^"]*"/g, "");

  for (const { file, section, current } of PAGES) {
    test(`${file}: вкладки, «Написать», без гамбургера`, () => {
      const html = read(file);
      assert.ok(!html.includes("nav__menu-toggle"), "гамбургера нет");
      assert.ok(!html.includes('id="nav-links"'), "id от гамбургера убран");
      const block = tabbarBlock(html);
      assert.ok(block, "есть .tabbar сразу после шапки");
      assert.ok(html.indexOf("</header>") < html.indexOf('<nav class="tabbar"'));

      const tabs = [...block.matchAll(
        /<a class="tabbar__tab" href="([^"]+)"(?: aria-current="([^"]+)")?>[\s\S]*?<span class="tabbar__label">([^<]+)<\/span>/g
      )];
      assert.deepEqual(tabs.map((m) => [m[1], m[3]]), TAB_LINKS);
      tabs.forEach((m, i) => {
        const expected = section && SECTION_INDEX[section] === i ? current : undefined;
        assert.equal(m[2], expected, `aria-current у вкладки «${m[3]}»`);
      });
      assert.match(block, /<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact"/);
      assert.equal(block.replace(/ aria-current="[^"]*"/g, ""), reference, "панель совпадает с главной");
    });
  }

  test("гамбургер удалён из CSS и JS", () => {
    assert.ok(!read("src/style.css").includes("nav__menu-toggle"));
    assert.ok(!read("src/nav.js").includes("menu-toggle"));
  });
});

describe("нижняя панель — поведение", () => {
  const ctx = withBrowser();

  const state = `(() => {
    const bar = document.querySelector(".tabbar");
    const cs = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const cur = bar.querySelector("[aria-current]");
    return {
      display: cs.display,
      visibility: cs.visibility,
      hidden: bar.classList.contains("is-hidden"),
      suppressed: bar.classList.contains("is-suppressed"),
      bottom: Math.round(rect.bottom),
      current: cur ? cur.textContent.trim() : null,
      line: cur ? getComputedStyle(cur.querySelector(".tabbar__label"), "::after").transform : null,
      top: getComputedStyle(document.querySelector(".nav__links")).display,
      contact: getComputedStyle(document.querySelector(".nav__contact")).display,
      footer: getComputedStyle(document.querySelector(".footer")).paddingBottom,
    };
  })()`;

  test("на 390px: панель внизу, в шапке только логотип, текущая вкладка подчёркнута", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const s = await ctx.page.eval(state);
    assert.equal(s.display, "grid");
    assert.equal(s.bottom, 836);
    assert.equal(s.top, "none");
    assert.equal(s.contact, "none");
    assert.equal(s.current, "Кейсы");
    assert.equal(s.line, "matrix(1, 0, 0, 1, 0, 0)");
    assert.equal(s.footer, "114px");
  });

  test("на 1440px панели нет", async () => {
    await ctx.page.goto("/cases.html", { width: 1440 });
    assert.equal((await ctx.page.eval(state)).display, "none");
  });

  test("прячется при прокрутке вниз, возвращается вверх и у конца страницы", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await ctx.page.eval(`window.scrollTo({ top: 700, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, true, "вниз — спряталась");
    await ctx.page.eval(`window.scrollTo({ top: 400, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false, "вверх — вернулась");
    await ctx.page.eval(`window.scrollTo({ top: 900, behavior: "instant" })`);
    await ctx.page.wait(300);
    await ctx.page.eval(`window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false, "у конца страницы — видна");
  });

  test("при уменьшении движения не прячется", async () => {
    await ctx.page.goto("/", { width: 390, height: 844, reducedMotion: true });
    await ctx.page.eval(`window.scrollTo({ top: 700, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false);
  });

  test("скрыта, пока фокус в текстовом поле", async () => {
    await ctx.page.goto("/unit-economics.html", { width: 390, height: 844 });
    await ctx.page.eval(`document.getElementById("ue-impressions").focus()`);
    let s = await ctx.page.eval(state);
    assert.equal(s.suppressed, true);
    assert.equal(s.visibility, "hidden");
    await ctx.page.eval(`document.activeElement.blur()`);
    s = await ctx.page.eval(state);
    assert.equal(s.suppressed, false);
    assert.equal(s.visibility, "visible");
  });

  test("без JS «Написать» ведёт на форму главной", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844, js: false });
    const href = await ctx.page.eval(`document.querySelector(".tabbar__cta").getAttribute("href")`);
    assert.equal(href, "/#contact");
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: FAIL — «гамбургера нет», «есть .tabbar», браузерные тесты падают на `document.querySelector(".tabbar")` = `null`.

- [ ] **Step 3: Создать `src/tabbar-state.js`**

```js
/* Причины, по которым нижняя панель скрыта: открыта шторка, открыта
   модалка, фокус в текстовом поле (выехала клавиатура). Отдельный
   модуль — чтобы nav.js и contact-modal.js не импортировали друг друга.
   Скрытие синхронное (класс → visibility:hidden): сразу после снятия
   последней причины элемент панели снова может получить фокус. */
const reasons = new Set();

export function setTabbarSuppressed(reason, on) {
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  const tabbar = document.querySelector(".tabbar");
  if (tabbar) tabbar.classList.toggle("is-suppressed", reasons.size > 0);
}
```

- [ ] **Step 4: Переписать `src/nav.js` целиком**

```js
/* NAV — общий модуль шапки и нижней панели, вызывается из всех entry
   (main.js, article.js, legal.js, unit-economics.js). К анимациям GSAP
   отношения не имеет — работает в обеих ветках reducedMotion.

   Меню «Написать» (десктоп): раскрывает телефон и почту. Escape
   закрывает и возвращает фокус на кнопку, клик снаружи тоже закрывает —
   тот же паттерн, что у contact-modal.js и подсказок «?» в калькуляторе.

   Нижняя панель (≤720px): прячется при прокрутке вниз, возвращается при
   прокрутке вверх и у конца страницы. При prefers-reduced-motion не
   прячется совсем. Пока фокус в текстовом поле — скрыта, чтобы не висеть
   над клавиатурой. */
import { setTabbarSuppressed } from "./tabbar-state.js";

export function initNav() {
  const contactToggle = document.querySelector(".nav__contact .nav__cta");
  const contactMenu = document.getElementById("nav-contact-menu");
  if (contactToggle && contactMenu) initContactMenu(contactToggle, contactMenu);

  const tabbar = document.querySelector(".tabbar");
  if (tabbar) initTabbar(tabbar);
}

function initContactMenu(toggle, menu) {
  const close = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    if (menu.hidden) {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    } else {
      close();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".nav__contact")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      close();
      toggle.focus();
    }
  });
}

function initTabbar(tabbar) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
      const hide = !reduce.matches && y > lastY && y > 90 && !atEnd;
      tabbar.classList.toggle("is-hidden", hide);
      lastY = y;
    },
    { passive: true }
  );

  /* Клавиатуру вызывают только текстовые поля — чекбоксы и кнопки нет. */
  const isTextField = (el) =>
    el instanceof Element &&
    el.matches(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select'
    );
  document.addEventListener("focusin", (e) => {
    if (isTextField(e.target)) setTabbarSuppressed("field", true);
  });
  document.addEventListener("focusout", (e) => {
    if (isTextField(e.target)) setTabbarSuppressed("field", false);
  });
}
```

- [ ] **Step 5: Разметка во всех 10 файлах — убрать гамбургер, вставить панель**

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";

const pages = [
  ["index.html", 0, "page"], ["privacy.html", null, null], ["terms.html", null, null],
  ["consent.html", null, null], ["404.html", null, null], ["case-zhbi.html", 1, "true"],
  ["unit-economics.html", null, null], ["growth-system.html", 2, "true"],
  ["cases.html", 1, "page"], ["articles.html", 2, "page"],
];

const hamburger = `      <button
        class="nav__menu-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="nav-links"
        aria-label="Открыть меню"
      >
        <span class="nav__menu-toggle-bar"></span>
        <span class="nav__menu-toggle-bar"></span>
        <span class="nav__menu-toggle-bar"></span>
      </button>
`;

const svg = (cls, viewBox, width, body) =>
  `<svg class="${cls}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const tabs = [
  ["%BASE_URL%", "Главная", svg("tabbar__icon tabbar__icon--mark", "-6 -6 112 172", "11",
    '<path d="M 6 155 L 82 75 A 44 44 0 1 0 18 75 L 94 155 Z" />')],
  ["%BASE_URL%cases", "Кейсы", svg("tabbar__icon", "0 0 24 24", "1.6",
    '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5" /><path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" /><path d="M3.5 12.5h17" />')],
  ["%BASE_URL%articles", "Статьи", svg("tabbar__icon", "0 0 24 24", "1.6",
    '<rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />')],
];

const tabbar = (currentIndex, currentValue) => [
  `    <nav class="tabbar" aria-label="Разделы сайта">`,
  ...tabs.flatMap(([href, label, icon], i) => [
    `      <a class="tabbar__tab" href="${href}"${i === currentIndex ? ` aria-current="${currentValue}"` : ""}>`,
    `        ${icon}`,
    `        <span class="tabbar__label">${label}</span>`,
    `      </a>`,
  ]),
  `      <a class="abra-cta tabbar__cta" href="%BASE_URL%#contact">`,
  `        <span class="abra-cta__frame" aria-hidden="true">`,
  `          <span class="abra-cta__corner abra-cta__corner--tl"></span>`,
  `          <span class="abra-cta__corner abra-cta__corner--tr"></span>`,
  `          <span class="abra-cta__corner abra-cta__corner--bl"></span>`,
  `          <span class="abra-cta__corner abra-cta__corner--br"></span>`,
  `        </span>`,
  `        <span class="abra-cta__label">Написать</span>`,
  `      </a>`,
  `    </nav>`,
].join("\n");

const once = (html, needle, file, name) => {
  const count = html.split(needle).length - 1;
  if (count !== 1) throw new Error(`${file}: ${name} найден ${count} раз`);
};

for (const [file, currentIndex, currentValue] of pages) {
  let html = readFileSync(file, "utf8");
  once(html, hamburger, file, "гамбургер");
  html = html.replace(hamburger, "");
  once(html, '<nav class="nav__links" id="nav-links">', file, "nav__links");
  html = html.replace('<nav class="nav__links" id="nav-links">', '<nav class="nav__links">');
  once(html, "    </header>\n", file, "</header>");
  html = html.replace("    </header>\n", `    </header>\n${tabbar(currentIndex, currentValue)}\n`);
  writeFileSync(file, html);
  console.log("ok", file);
}
EOF
```

- [ ] **Step 6: CSS — удалить гамбургер**

В `src/style.css`:

1. Удалить всё от комментария `/* Гамбургер — виден только ≤720px, там же, где .nav__links раньше просто` до закрывающей `}` блока `@media (max-width: 720px) { … }`, который идёт сразу за правилами `.nav__menu-toggle[aria-expanded="true"] …` (в нём лежат `.nav__menu-toggle { display: flex; }` и раскладка `.nav__links` выпадающей панелью).
2. В общем правиле фокуса удалить строку `.nav__menu-toggle:focus-visible,`.

Проверка: `grep -n 'menu-toggle' src/style.css` — пусто.

- [ ] **Step 7: CSS — добавить нижнюю панель**

На место удалённого блока (сразу после правила `.nav__contact-link:hover, .nav__contact-link:focus-visible { … }`) вставить:

```css
/* TABBAR — нижняя панель навигации на ≤720px. Шапка сверху сжимается
   до логотипа, ссылки и «Написать» живут внизу, в зоне большого
   пальца. «Написать» — .abra-cta уровня 1 с размерами под ячейку.
   Слой 35: выше шапки (20) и меню «Написать» (30), ниже cookie (40),
   шторки (45), подсказки калькулятора (50), модалки (60). */
.tabbar {
  display: none;
}

.tabbar.is-suppressed {
  visibility: hidden;
}

@media (max-width: 720px) {
  .nav__links,
  .nav__contact {
    display: none;
  }

  .tabbar {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(8px + env(safe-area-inset-bottom));
    z-index: 35;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.4fr);
    gap: 2px;
    height: 66px;
    padding: 6px;
    border: 1px solid var(--border-surface);
    border-radius: 22px;
    background: rgba(19, 18, 16, 0.86);
    -webkit-backdrop-filter: blur(18px) saturate(1.2);
    backdrop-filter: blur(18px) saturate(1.2);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
    transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .tabbar.is-hidden {
    transform: translateY(calc(100% + 16px + env(safe-area-inset-bottom)));
    opacity: 0;
    pointer-events: none;
  }

  .tabbar__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    border-radius: 12px;
    color: var(--text);
  }

  .tabbar__tab:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -2px;
  }

  .tabbar__icon {
    width: 22px;
    height: 22px;
    opacity: 0.72;
    transition: opacity 260ms ease;
  }

  .tabbar__icon--mark {
    width: 14px;
  }

  /* Текущая вкладка — уровень 3: подчёркивание растёт слева. */
  .tabbar__label {
    position: relative;
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    opacity: 0.72;
    transition: opacity 260ms ease;
  }

  .tabbar__label::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -4px;
    height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .tabbar__tab[aria-current] {
    color: var(--accent);
  }

  .tabbar__tab[aria-current] .tabbar__icon,
  .tabbar__tab[aria-current] .tabbar__label {
    opacity: 1;
  }

  .tabbar__tab[aria-current] .tabbar__label::after {
    transform: scaleX(1);
  }

  /* Два класса — иначе переменные перебьёт .abra-cta
     внутри @media (max-width: 900px). */
  .tabbar .abra-cta {
    --cta-h: 54px;
    --cta-pad-x: 10px;
    --cta-bracket-span: 32px;
    --cta-corner-h: 11px;
    --cta-corner-w: 8px;
    --cta-shift: 3px;
    align-self: center;
    justify-content: center;
    width: 100%;
  }

  .tabbar .abra-cta__label {
    font-size: 12px;
  }

  /* В конце страницы панель всегда видна — правовые ссылки футера
     не должны прятаться под ней. 32 — обычный отступ, 66 — панель,
     16 — два зазора по 8px. */
  .footer {
    padding-bottom: calc(32px + 66px + 16px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 720px) and (prefers-reduced-motion: reduce) {
  .tabbar,
  .tabbar__icon,
  .tabbar__label,
  .tabbar__label::after {
    transition: none;
  }
}
```

- [ ] **Step 8: Убедиться, что тесты проходят**

Run: `npm test`

Expected: `# fail 0`, включая `smoke.test.mjs` на 320px.

- [ ] **Step 9: Посмотреть глазами**

Дев-сервер, 390×844: `/`, `/cases`, `/growth-system`. Ожидаемо: сверху только логотип; панель над нижним краем; текущая вкладка медная и подчёркнута; «Написать» — скобки; при прокрутке вниз панель уезжает, вверх — возвращается. На 1440 панели нет, шапка как после Task 5. Кнопка «Разобрать систему» на главной может пока частично уходить под панель — это чинит Task 7.

- [ ] **Step 10: Commit**

```bash
git add src/tabbar-state.js src/nav.js src/style.css tests/navigation.test.mjs index.html privacy.html terms.html consent.html 404.html case-zhbi.html unit-economics.html growth-system.html cases.html articles.html
git commit -m "Move phone navigation to a bottom tab bar and remove the hamburger

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Cookie-карточка над панелью и портрет в hero

**Files:**
- Modify: `tests/navigation.test.mjs` (новый `describe` в конце)
- Modify: `src/style.css` — новый `@media (max-width: 720px)` после cookie-блока `@media (max-width: 560px) { … }` (~стр. 1950–1960); новый `@media (max-width: 720px)` сразу после `@media (max-width: 900px) { … }` с `.hero__portrait` (~стр. 480–537)

**Interfaces:**
- Consumes: `withBrowser()` из Task 4; `.tabbar` (66px, отступ 8px снизу) и токен `--border-surface` из задач 4 и 6.
- Produces: ничего нового для других задач.

- [ ] **Step 1: Дописать падающий тест**

В конец `tests/navigation.test.mjs`:

```js
describe("телефон: cookie-карточка и hero над панелью", () => {
  const ctx = withBrowser();

  const rects = `(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
    };
    return {
      cookie: box("#cookie-banner"),
      bar: box(".tabbar"),
      cta: box(".hero .abra-cta"),
      radius: getComputedStyle(document.getElementById("cookie-banner")).borderRadius,
    };
  })()`;

  test("cookie-баннер — отдельная карточка над панелью", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    await ctx.page.eval("localStorage.clear()");
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const r = await ctx.page.eval(rects);
    assert.equal(r.cookie.left, 12);
    assert.equal(r.cookie.right, 378);
    assert.equal(r.radius, "18px");
    assert.ok(r.cookie.bottom <= r.bar.top - 6, `карточка до ${r.cookie.bottom}, панель с ${r.bar.top}`);
  });

  for (const [width, height] of [[390, 844], [375, 667]]) {
    test(`hero ${width}×${height}: «Разобрать систему» целиком над панелью`, async () => {
      await ctx.page.goto("/", { width, height });
      await ctx.page.wait(1800); // вступительная анимация hero
      const r = await ctx.page.eval(rects);
      assert.ok(r.cta.bottom <= r.bar.top - 12, `кнопка до ${r.cta.bottom}, панель с ${r.bar.top}`);
    });
  }
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: FAIL — cookie-баннер во всю ширину (`left` = 0, `borderRadius` = `0px`), и хотя бы один тест hero: кнопка ниже верхнего края панели.

- [ ] **Step 3: CSS — cookie-карточка**

Сразу после блока `@media (max-width: 560px) { .cookie-banner { … } }` вставить:

```css
/* На ≤720px cookie-баннер — плавающая карточка над нижней панелью:
   8px зазор + 66px панель + 8px зазор + безопасная зона iPhone. */
@media (max-width: 720px) {
  .cookie-banner {
    left: 12px;
    right: 12px;
    bottom: calc(8px + 66px + 8px + env(safe-area-inset-bottom));
    flex-wrap: nowrap;
    gap: 12px;
    padding: 14px 14px 14px 16px;
    border: 1px solid var(--border-surface);
    border-radius: 18px;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
  }

  .cookie-banner__text {
    font-size: 12.5px;
    line-height: 1.45;
  }
}
```

- [ ] **Step 4: CSS — портрет в hero**

Сразу после закрывающей `}` блока `@media (max-width: 900px) { … }`, внутри которого есть `.hero__portrait { … height: 44vh; min-height: 320px; max-height: 460px; … }`, вставить:

```css
/* На ≤720px внизу нижняя панель — портрет ниже, чтобы «Разобрать
   систему» на первом экране целиком стояла над ней. Критерий из
   спецификации: 390×844 и 375×667, зазор от 12px. Ниже 200px портрет
   не опускать — если места не хватает, ужимать отступы .hero__sub. */
@media (max-width: 720px) {
  .hero__portrait {
    height: clamp(200px, 30svh, 260px);
    min-height: 0;
    max-height: none;
  }
}
```

- [ ] **Step 5: Прогнать тест**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: PASS. **Если падает только `hero 375×667`** — добавить внутрь того же `@media (max-width: 720px)` после `.hero__portrait { … }`:

```css
  .hero__sub {
    margin: 18px 0 24px;
  }
```

и прогнать снова. Если и после этого не проходит — не уменьшать портрет ниже 200px и не выдумывать других правок: остановиться и сообщить владельцу цифры из сообщения теста.

- [ ] **Step 6: Полный прогон**

Run: `npm test`

Expected: `# fail 0`.

- [ ] **Step 7: Посмотреть глазами**

Дев-сервер в приватном окне (чтобы появился cookie-баннер), 390×844 и 375×667, главная. Ожидаемо: баннер — скруглённая карточка над панелью, не перекрывает её; «Разобрать систему» над панелью; портрет ниже, чем был.

- [ ] **Step 8: Commit**

```bash
git add src/style.css tests/navigation.test.mjs
git commit -m "Float the cookie notice above the tab bar and shorten the hero portrait on phones

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Шторка «Написать»

**Files:**
- Modify: `src/contact-modal.js` — импорт, экспорт `openContactModal`, скрытие панели при модалке, порядок возврата фокуса
- Modify: `src/nav.js` — импорт, блок шторки
- Modify: `src/style.css` — блок SHEET сразу после блоков TABBAR
- Modify: все 10 HTML — атрибуты у `.tabbar__cta`, разметка шторки сразу после `</nav>` панели
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `setTabbarSuppressed(reason, on)` из Task 6; `.tabbar__cta` из Task 6; `PAGES[].modal` из Task 1.
- Produces:
  - `src/contact-modal.js`: `export function openContactModal(opener: HTMLElement): boolean` — `false`, если на странице нет `#contact-modal`.
  - Разметка: `#contact-sheet` (`.sheet`, `.sheet__scrim`, `.sheet__panel`), атрибуты `data-sheet-open`, `data-sheet-close`, `data-sheet-apply`.

- [ ] **Step 1: Дописать падающий тест**

В конец `tests/navigation.test.mjs`:

```js
const sheetBlock = (html) => {
  const m = html.match(/    <div class="sheet" id="contact-sheet" hidden>[\s\S]*?\n    <\/div>\n/);
  return m ? m[0] : null;
};
const normalizeSheet = (block) =>
  block.replace(/<(button|a) class="abra-cta"[^>]*>[\s\S]*?<\/\1>/, "@@APPLY@@");

describe("шторка — разметка", () => {
  const reference = normalizeSheet(sheetBlock(read("index.html")) ?? "");

  for (const { file, modal } of PAGES) {
    test(`${file}: шторка после панели, вариант «Оставить заявку»`, () => {
      const html = read(file);
      assert.equal(html.split('id="contact-sheet"').length - 1, 1);
      assert.match(
        html,
        /<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact" data-sheet-open aria-haspopup="dialog" aria-controls="contact-sheet">/
      );
      const block = sheetBlock(html);
      assert.ok(block, "есть #contact-sheet");
      assert.ok(html.indexOf('<nav class="tabbar"') < html.indexOf('id="contact-sheet"'));
      if (modal) {
        assert.match(block, /<button class="abra-cta" type="button" data-sheet-apply/);
      } else {
        assert.match(block, /<a class="abra-cta" href="%BASE_URL%#contact">/);
        assert.ok(!block.includes("data-sheet-apply"));
      }
      assert.equal(normalizeSheet(block), reference, "шторка совпадает с главной");
    });
  }
});

describe("шторка — поведение", () => {
  const ctx = withBrowser();

  const state = `(() => {
    const sheet = document.getElementById("contact-sheet");
    const bar = document.querySelector(".tabbar");
    const modal = document.getElementById("contact-modal");
    const active = document.activeElement;
    return {
      sheetHidden: sheet.hidden,
      open: sheet.classList.contains("is-open"),
      focusOnPanel: active === sheet.querySelector(".sheet__panel"),
      focusInSheet: sheet.contains(active),
      focusOnOpener: active ? active.matches("[data-sheet-open]") : false,
      barSuppressed: bar.classList.contains("is-suppressed"),
      barVisibility: getComputedStyle(bar).visibility,
      overflow: document.body.style.overflow,
      modalHidden: modal ? modal.hidden : null,
    };
  })()`;

  const openSheet = async () => {
    await ctx.page.eval(`document.querySelector("[data-sheet-open]").click()`);
    await ctx.page.wait(400);
  };

  test("открывается: фокус на панели, панель навигации скрыта, прокрутка заблокирована", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, false);
    assert.equal(s.open, true);
    assert.equal(s.focusOnPanel, true);
    assert.equal(s.barSuppressed, true);
    assert.equal(s.barVisibility, "hidden");
    assert.equal(s.overflow, "hidden");
  });

  test("Tab не выходит из шторки", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    for (let i = 0; i < 8; i++) {
      await ctx.page.press("Tab");
      assert.equal((await ctx.page.eval(state)).focusInSheet, true, `Tab №${i + 1}`);
    }
  });

  test("Escape закрывает и возвращает фокус на «Написать»", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.press("Escape");
    await ctx.page.wait(450);
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, true);
    assert.equal(s.focusOnOpener, true);
    assert.equal(s.barSuppressed, false);
    assert.equal(s.overflow, "");
  });

  test("тап по затемнению закрывает", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(`document.querySelector(".sheet__scrim").click()`);
    await ctx.page.wait(450);
    assert.equal((await ctx.page.eval(state)).sheetHidden, true);
  });

  test("«Оставить заявку» открывает модалку, после неё фокус на «Написать»", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(`document.querySelector("[data-sheet-apply]").click()`);
    await ctx.page.wait(450);
    let s = await ctx.page.eval(state);
    assert.equal(s.modalHidden, false, "модалка открыта");
    assert.equal(s.sheetHidden, true, "шторка закрыта");
    assert.equal(s.barSuppressed, true, "панель скрыта под модалкой");
    await ctx.page.press("Escape");
    await ctx.page.wait(450);
    s = await ctx.page.eval(state);
    assert.equal(s.modalHidden, true);
    assert.equal(s.barSuppressed, false);
    assert.equal(s.focusOnOpener, true, "фокус вернулся на «Написать» в панели");
  });

  test("на странице без модалки «Оставить заявку» — ссылка на форму главной", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const href = await ctx.page.eval(
      `document.querySelector("#contact-sheet .sheet__actions a.abra-cta").getAttribute("href")`
    );
    assert.equal(href, "/#contact");
  });

  test("при уменьшении движения открывается и закрывается без анимации", async () => {
    await ctx.page.goto("/", { width: 390, height: 844, reducedMotion: true });
    await ctx.page.eval(`document.querySelector("[data-sheet-open]").click()`);
    assert.equal((await ctx.page.eval(state)).sheetHidden, false);
    await ctx.page.press("Escape");
    await ctx.page.wait(50);
    assert.equal((await ctx.page.eval(state)).sheetHidden, true);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/navigation.test.mjs`

Expected: FAIL — нет `id="contact-sheet"`; браузерные тесты падают на `document.getElementById("contact-sheet")` = `null`.

- [ ] **Step 3: `src/contact-modal.js`**

1. После первого комментария файла (перед `const pageLoadedAt = Date.now();`) добавить:

```js
import { setTabbarSuppressed } from "./tabbar-state.js";

/* Функция открытия, которую initContactModal() регистрирует на странице
   с #contact-modal. На страницах без модалки остаётся null. */
let openModalImpl = null;

/* Открыть модалку заявки из другого модуля — шторка «Написать» в nav.js.
   opener — элемент, на который вернуть фокус после закрытия.
   Возвращает false, если модалки на странице нет. */
export function openContactModal(opener) {
  if (!openModalImpl) return false;
  openModalImpl(opener);
  return true;
}
```

2. В `openModal` сразу после `contactModal.hidden = false;` добавить:

```js
    setTabbarSuppressed("modal", true);
```

3. Сразу после закрывающей `};` функции `openModal` добавить:

```js
  openModalImpl = openModal;
```

4. Внутри `closeModal` заменить функцию `finish` на:

```js
    const finish = () => {
      contactModal.hidden = true;
      /* Сначала вернуть нижнюю панель, потом фокус: на элемент с
         visibility:hidden фокус не встаёт, и focus() молча не сработает. */
      setTabbarSuppressed("modal", false);
      if (modalOpener) modalOpener.focus();
    };
```

- [ ] **Step 4: `src/nav.js`**

1. Заменить строку `import { setTabbarSuppressed } from "./tabbar-state.js";` на:

```js
import { openContactModal } from "./contact-modal.js";
import { setTabbarSuppressed } from "./tabbar-state.js";
```

2. В конец функции `initNav()` (после `if (tabbar) initTabbar(tabbar);`) добавить:

```js
  const sheet = document.getElementById("contact-sheet");
  const sheetOpener = document.querySelector("[data-sheet-open]");
  if (sheet && sheetOpener) initSheet(sheet, sheetOpener);
```

3. В конец файла добавить:

```js
/* ШТОРКА «Написать» (≤720px) — открывается кнопкой нижней панели вместо
   перехода по её href (без JS href ведёт на форму главной). Фокус при
   открытии — на саму панель шторки, чтобы скринридер прочитал заголовок;
   Tab ходит по кругу; Escape, затемнение и «Закрыть» закрывают и
   возвращают фокус на «Написать». «Оставить заявку» на страницах с
   модалкой закрывает шторку и открывает модалку, фокус после неё — тоже
   на «Написать». */
function initSheet(sheet, opener) {
  const panel = sheet.querySelector(".sheet__panel");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let closeTimer = null;

  const focusables = () =>
    Array.from(panel.querySelectorAll("a[href], button:not([disabled])")).filter(
      (el) => el.offsetParent !== null
    );

  const open = () => {
    clearTimeout(closeTimer);
    sheet.hidden = false;
    setTabbarSuppressed("sheet", true);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    panel.focus();
  };

  const close = ({ returnFocus = true } = {}) => {
    sheet.classList.remove("is-open");
    document.body.style.overflow = "";
    const finish = () => {
      sheet.hidden = true;
      /* Сначала показать панель, потом вернуть фокус — см. tabbar-state.js. */
      setTabbarSuppressed("sheet", false);
      if (returnFocus) opener.focus();
    };
    if (reduce.matches) finish();
    else closeTimer = setTimeout(finish, 300);
  };

  opener.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  sheet.querySelectorAll("[data-sheet-close]").forEach((el) => {
    el.addEventListener("click", () => close());
  });

  const apply = sheet.querySelector("[data-sheet-apply]");
  if (apply) {
    apply.addEventListener("click", () => {
      close({ returnFocus: false });
      openContactModal(opener);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (sheet.hidden) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
```

- [ ] **Step 5: Разметка шторки во всех 10 файлах**

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";

const pages = [
  ["index.html", true], ["privacy.html", false], ["terms.html", false], ["consent.html", false],
  ["404.html", false], ["case-zhbi.html", true], ["unit-economics.html", true],
  ["growth-system.html", true], ["cases.html", false], ["articles.html", false],
];

const icon = (cls, body) =>
  `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const chevron = icon("sheet__row-chevron", '<path d="m9.5 6 6 6-6 6" />');
const row = (href, iconBody, title, detail) => [
  `          <a class="sheet__row" href="${href}">`,
  `            <span class="sheet__row-icon">${icon("", iconBody)}</span>`,
  `            <span class="sheet__row-text"><span class="sheet__row-title">${title}</span><span class="sheet__row-detail">${detail}</span></span>`,
  `            ${chevron}`,
  `          </a>`,
];
const frame = [
  `            <span class="abra-cta__frame" aria-hidden="true">`,
  `              <span class="abra-cta__corner abra-cta__corner--tl"></span>`,
  `              <span class="abra-cta__corner abra-cta__corner--tr"></span>`,
  `              <span class="abra-cta__corner abra-cta__corner--bl"></span>`,
  `              <span class="abra-cta__corner abra-cta__corner--br"></span>`,
  `            </span>`,
  `            <span class="abra-cta__label">Оставить заявку</span>`,
];
const apply = (hasModal) => hasModal
  ? [`          <button class="abra-cta" type="button" data-sheet-apply aria-haspopup="dialog" aria-controls="contact-modal">`, ...frame, `          </button>`]
  : [`          <a class="abra-cta" href="%BASE_URL%#contact">`, ...frame, `          </a>`];

const sheet = (hasModal) => [
  `    <div class="sheet" id="contact-sheet" hidden>`,
  `      <div class="sheet__scrim" data-sheet-close></div>`,
  `      <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="contact-sheet-title" tabindex="-1">`,
  `        <span class="sheet__grabber" aria-hidden="true"></span>`,
  `        <h2 class="sheet__title" id="contact-sheet-title">Как удобнее связаться</h2>`,
  `        <p class="sheet__sub">Первый разговор — 30 минут, бесплатно. Отвечаю в течение 48 часов.</p>`,
  `        <div class="sheet__rows">`,
  ...row("tel:+79110256443",
    '<path d="M6.6 3.5h2.8l1.5 4-2 1.3a11 11 0 0 0 6.3 6.3l1.3-2 4 1.5v2.8a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />',
    "Позвонить", "+7 911 025-64-43"),
  ...row("mailto:info@a-bra.ru",
    '<rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" />',
    "Написать на почту", "info@a-bra.ru"),
  `        </div>`,
  `        <div class="sheet__actions">`,
  ...apply(hasModal),
  `          <button class="sheet__close" type="button" data-sheet-close>Закрыть</button>`,
  `        </div>`,
  `      </div>`,
  `    </div>`,
].join("\n");

const ctaBefore = '<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact">';
const ctaAfter = '<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact" data-sheet-open aria-haspopup="dialog" aria-controls="contact-sheet">';

for (const [file, hasModal] of pages) {
  let html = readFileSync(file, "utf8");
  if (html.split(ctaBefore).length - 1 !== 1) throw new Error(`${file}: .tabbar__cta не найден`);
  html = html.replace(ctaBefore, ctaAfter);
  const start = html.indexOf('<nav class="tabbar"');
  const closing = "\n    </nav>\n";
  const end = html.indexOf(closing, start);
  if (start === -1 || end === -1) throw new Error(`${file}: не найдено окончание .tabbar`);
  const at = end + closing.length;
  html = html.slice(0, at) + sheet(hasModal) + "\n" + html.slice(at);
  writeFileSync(file, html);
  console.log("ok", file, hasModal ? "модалка" : "ссылка");
}
EOF
```

- [ ] **Step 6: CSS — шторка**

Сразу после блока `@media (max-width: 720px) and (prefers-reduced-motion: reduce) { .tabbar, … }` вставить:

```css
/* SHEET — шторка «Написать»: звонок, почта, заявка. Открывается кнопкой
   нижней панели. Слой 45: выше cookie-карточки (40), ниже подсказки
   калькулятора (50) и модалки заявки (60). */
.sheet[hidden] {
  display: none;
}

.sheet {
  position: fixed;
  inset: 0;
  z-index: 45;
}

.sheet__scrim {
  position: absolute;
  inset: 0;
  background: rgba(12, 11, 9, 0.72);
  opacity: 0;
  transition: opacity 240ms ease;
}

.sheet__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: calc(100svh - 24px);
  overflow-y: auto;
  padding: 10px 18px calc(48px + env(safe-area-inset-bottom));
  background: var(--bg-warm);
  border-top: 1px solid var(--border-surface);
  border-radius: 26px 26px 0 0;
  outline: none;
  transform: translateY(105%);
  transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sheet.is-open .sheet__scrim {
  opacity: 1;
}

.sheet.is-open .sheet__panel {
  transform: translateY(0);
}

.sheet__grabber {
  display: block;
  width: 38px;
  height: 4px;
  margin: 0 auto 18px;
  border-radius: 2px;
  background: rgba(206, 201, 195, 0.28);
}

.sheet__title {
  margin: 0;
  padding: 0 4px;
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--snow);
}

.sheet__sub {
  margin: 0;
  padding: 6px 4px 16px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text);
  opacity: 0.75;
}

.sheet__rows {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.sheet__row {
  display: grid;
  grid-template-columns: 42px 1fr 18px;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.sheet__row:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -2px;
}

.sheet__row-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border-control);
  border-radius: 50%;
  color: var(--accent);
}

.sheet__row-icon svg {
  width: 20px;
  height: 20px;
}

.sheet__row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sheet__row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--snow);
}

.sheet__row-detail {
  font-size: 13.5px;
  color: var(--text);
  opacity: 0.75;
}

.sheet__row-chevron {
  width: 18px;
  height: 18px;
  color: var(--text);
  opacity: 0.6;
}

.sheet__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
}

.sheet__close {
  height: 48px;
  padding: 0 18px;
  border: 0;
  background: transparent;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}

.sheet__close:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .sheet__scrim,
  .sheet__panel {
    transition: none;
  }
}
```

- [ ] **Step 7: Убедиться, что тесты проходят**

Run: `npm test`

Expected: `# fail 0`.

- [ ] **Step 8: Посмотреть глазами**

Дев-сервер, 390×844: на `/` нажать «Написать» → шторка снизу, панель пропала; «Оставить заявку» → модалка; закрыть модалку → панель вернулась, фокус на «Написать». На `/cases` «Оставить заявку» ведёт на форму главной. На 1440 «Написать» в шапке по-прежнему раскрывает меню с телефоном и почтой.

- [ ] **Step 9: Commit**

```bash
git add src/contact-modal.js src/nav.js src/style.css tests/navigation.test.mjs index.html privacy.html terms.html consent.html 404.html case-zhbi.html unit-economics.html growth-system.html cases.html articles.html
git commit -m "Open a contact sheet from the tab bar and hand off to the request form

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Документация навигации и сдача этапа B

**Files:**
- Modify: `CLAUDE.md` — разделы «Структура файлов», «Дизайн-токены», «Композиция страницы», «Сквозная шапка», «Компонент `.abra-cta`», «Форма обратной связи», «Как работать над этим проектом»

**Interfaces:**
- Consumes: всё, что сделано в задачах 1–8.
- Produces: актуальный `CLAUDE.md` — его читает каждая следующая сессия.

- [ ] **Step 1: «Структура файлов»**

Заменить описание `nav.js` (три строки, начиная с `  nav.js              — initNav(): раскрывающееся меню «Написать»`) на:

```
  nav.js              — initNav(): меню «Написать» в шапке (десктоп), автоскрытие
                        нижней панели .tabbar, шторка «Написать» #contact-sheet.
                        Общий модуль для ВСЕХ entry — см. «Сквозная шапка»
  tabbar-state.js     — setTabbarSuppressed(reason, on): причины скрыть нижнюю
                        панель (шторка, модалка, фокус в поле). Отдельным модулем,
                        чтобы nav.js и contact-modal.js не импортировали друг друга
```

После строки с `.claude/launch.json` добавить:

```
tests/                — проверки без npm-зависимостей: node:test + headless Chrome
                        через DevTools Protocol (нужны Node ≥22 и Google Chrome).
                        npm test собирает dist/ и прогоняет всё
docs/superpowers/     — спецификации и планы внедрения
```

- [ ] **Step 2: «Дизайн-токены»**

В блоке кода с токенами после строки `--border-control: …` добавить:

```
--border-surface: rgba(206,201,195,0.16); /* края плавающих плашек: нижняя панель, шторка, cookie-карточка на телефоне */
--nav-h: calc(84px + env(safe-area-inset-top)); /* высота шапки с безопасной зоной — scroll-margin-top, липкие панели */
```

- [ ] **Step 3: «Композиция страницы»**

В конец первого абзаца раздела добавить предложение:

```
На главной нет якорной навигации: `id` секций остаются (на них можно ссылаться снаружи), но в меню их нет — см. «Сквозная шапка».
```

- [ ] **Step 4: «Сквозная шапка» — переписать раздел целиком**

Заменить весь раздел от заголовка `## Сквозная шапка (`.nav`)` до следующего заголовка `## Страницы-списки` (не включая его) на:

```markdown
## Сквозная шапка (`.nav`) и нижняя панель (`.tabbar`)

С 15.09.2026 навигация одинакова на всех 10 страницах и не содержит якорей на секции главной. Спецификация — `docs/superpowers/specs/2026-09-15-navigation-and-button-system-design.md`.

**Шапка (>720px).** Логотип, три ссылки `.nav__links` — «Главная» (`%BASE_URL%`), «Кейсы» (`%BASE_URL%cases`), «Статьи» (`%BASE_URL%articles`) — и «Написать» (компактные скобки, уровень 2 системы кнопок), который раскрывает `.nav__contact-menu` с телефоном и почтой.

**Текущий раздел** — `aria-current` на ссылке шапки и на вкладке панели, выглядит как подчёркивание (уровень 3):

| Страница | Пункт | Значение |
|---|---|---|
| index | Главная | `page` |
| cases | Кейсы | `page` |
| case-zhbi | Кейсы | `true` |
| articles | Статьи | `page` |
| growth-system | Статьи | `true` |
| unit-economics, privacy, terms, consent, 404 | — | — |

Новая страница внутри раздела получает `aria-current="true"` на пункте раздела; страница вне разделов — без атрибута.

**Телефон (≤720px).** Шапка — только логотип; `.nav__links` и `.nav__contact` скрыты. Гамбургера нет — удалён 15.09.2026. Навигация — `.tabbar`, плавающая панель у нижнего края: три вкладки и «Написать» (`.abra-cta` уровня 1; ссылка на `%BASE_URL%#contact`, с JS открывает шторку `#contact-sheet`). Разметка панели и шторки стоит сразу после `</header>` и одинакова во всех 10 файлах, кроме `aria-current` и варианта кнопки «Оставить заявку».

**Панель прячется** при прокрутке вниз дальше 90px и возвращается при прокрутке вверх и у конца страницы (класс `is-hidden`, логика в `nav.js`); при `prefers-reduced-motion` не прячется. Отдельно она скрыта через `visibility: hidden` (класс `is-suppressed`), пока открыта шторка или модалка или фокус в текстовом поле — причины собирает `src/tabbar-state.js`. Снятие скрытия синхронное: сначала панель видима, потом возвращается фокус — на скрытый элемент фокус не встаёт.

**Слои `z-index`:** шапка 20, меню «Написать» 30, панель 35, cookie-баннер 40, шторка 45, подсказка калькулятора 50, модалка 60, skip-link 100.

**Безопасная зона iPhone.** Во всех файлах `viewport-fit=cover`; шапка учитывает `env(safe-area-inset-top/left/right)`, панель, шторка и cookie-карточка — `env(safe-area-inset-bottom)`. На ≤720px cookie-баннер — карточка над панелью, футер получает нижний отступ под панель, портрет в hero ограничен `clamp(200px, 30svh, 260px)`, чтобы «Разобрать систему» стояла над панелью.

При правке шапки, панели или шторки — менять разметку во всех 10 файлах и прогонять `npm test`: он сверяет, что панель и шторка совпадают.
```

- [ ] **Step 5: «Компонент `.abra-cta`»**

Заменить предложение `Используется 3 раза (hero, кнопка в разделе `cta`, submit-кнопка формы) плюс отдельный компонент `.nav__cta` в шапке.` на:

```
Уровень 1 системы кнопок (таблица ниже). «Написать» в шапке — та же `.abra-cta` с модификатором `--compact`, отдельного компонента пилюли больше нет.
```

В конец раздела (перед заголовком `## Система иконок разделов`) добавить:

```markdown
### Система кнопок — четыре уровня (с 15.09.2026)

Чем важнее действие, тем больше у кнопки рамки.

| Уровень | Вид | Где |
|---|---|---|
| 1. Главное действие | `.abra-cta` — скобки собираются в рамку | «Разобрать систему», «Перейти к форме», «Отправить заявку», CTA кейса, статьи и калькулятора, «Написать» в нижней панели, «Оставить заявку» в шторке |
| 2. Второстепенное | `.abra-cta.abra-cta--compact` — 44px, уголки только расходятся на 3px, рамку не строят | «Написать» в шапке (`.nav__cta`), «Хорошо» в cookie-баннере |
| 3. Ссылка и «вы здесь» | подчёркивание 1px `--accent`, растёт слева за 320 мс | `.abra-link`, пункты шапки, вкладки панели, активный пункт оглавления статьи |
| 4. Служебное | без скобок, медная обводка при фокусе | крестик модалки, «?» в калькуляторе, чекбоксы, skip-link |

В контенте экрана — не больше одной полной рамки. Исключение — «Написать» в нижней панели: это интерфейс, а не контент. Селекторы модификатора и размеров в панели — всегда два класса (`.abra-cta.abra-cta--compact`, `.tabbar .abra-cta`): иначе их перебьёт `.abra-cta` внутри `@media (max-width: 900px)`. Классы `nav__cta` и `cookie-banner__accept` остались хуками для `nav.js` и `cookie-consent.js` — своих стилей пилюль у них нет.
```

- [ ] **Step 6: «Форма обратной связи»**

После первого абзаца раздела (заканчивается на «…правь `contact-modal.js`, а не `main.js`.») добавить:

```markdown
Шторка «Написать» (`#contact-sheet`, ≤720px) открывает модалку через `openContactModal(opener)` из `contact-modal.js`; `opener` — «Написать» в нижней панели, на него возвращается фокус после закрытия модалки. Функция возвращает `false`, если на странице нет `#contact-modal`; на таких 6 страницах (privacy, terms, consent, 404, cases, articles) «Оставить заявку» в шторке — ссылка на `%BASE_URL%#contact`. Модалка при открытии скрывает нижнюю панель (`setTabbarSuppressed("modal", true)`) и возвращает её до возврата фокуса.
```

- [ ] **Step 7: «Как работать над этим проектом»**

Добавить пункт в список:

```
- `npm test` — перед каждым коммитом, который трогает шапку, панель, шторку, кнопки или карточки: сборка, проверки разметки во всех 10 файлах и браузерные проверки на шести ширинах. Нужны Node ≥22 и Google Chrome (путь переопределяется `CHROME_PATH`)
```

- [ ] **Step 8: Проверить, что в документации не осталось старого**

Run: `grep -n 'nav__menu-toggle\|гамбургер\|Инсайт.*Система.*Услуги' CLAUDE.md`

Expected: единственное совпадение — «Гамбургера нет — удалён 15.09.2026» в новом разделе «Сквозная шапка».

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md
git commit -m "Document the anchor-free navigation, tab bar, contact sheet and button tiers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Проверка этапа B целиком**

Run: `npm test`

Expected: `# fail 0`.

Затем глазами на дев-сервере — все 10 страниц на 1440, 768, 390 и 320:
- на 1440 и 768 — три ссылки в шапке, текущий раздел подчёркнут, «Написать» — компактные скобки;
- на 390 и 320 — сверху только логотип, панель внизу не перекрывает контент, в конце страницы ссылки футера над панелью;
- на iPhone с вырезом (реальное устройство или Safari → Develop → Responsive Design Mode → iPhone): шапка не заходит под вырез, панель над полоской «домой». **Если проверить негде — прямо сказать владельцу, что этот пункт не проверен.**

- [ ] **Step 11: Сдача этапа B**

Показать владельцу панель, шторку и шапку, перечислить, что не проверено (если что-то), и спросить разрешение на выкладку. **Без явного «да» — не сливать и не пушить.** После «да»:

```bash
git checkout main
git merge --ff-only feat/nav-button-system
git push origin main
gh run watch "$(gh run list --workflow deploy-vps.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
npm run build >/dev/null && ls dist/assets/ | grep '^main-'
curl -s https://a-bra.ru/ | grep -o 'assets/main-[^"]*\.js'
git checkout feat/nav-button-system
```

Expected: прогон деплоя успешен, имя `main-*.js` на проде совпадает с локальной сборкой.

---

## Этап C — карточки

### Task 10: Метки по углам у карточек кейсов и статей

**Files:**
- Create: `tests/cards.test.mjs`
- Modify: `cases.html`, `articles.html` — четыре метки внутри `<a class="content-card">`
- Modify: `src/style.css` — блоки `.content-card { … }` (~стр. 2207) и `.content-card:hover, .content-card:focus-visible { … }` (~2217); новый блок меток и `prefers-reduced-motion`
- Modify: `CLAUDE.md` — раздел «Страницы-списки»

**Interfaces:**
- Consumes: `launch`, `read` из Task 1; общее правило `.content-card:focus-visible { outline: 1px solid var(--accent); outline-offset: 4px; }` (оставить как есть).
- Produces: классы `.content-card__mark`, `.content-card__mark--tl|tr|bl|br`.

- [ ] **Step 1: Написать падающий тест**

Создать `tests/cards.test.mjs`:

```js
/* Карточки кейсов и статей: метки по углам вместо скруглённой рамки. */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { read } from "./helpers/pages.mjs";

const CORNERS = ["tl", "tr", "bl", "br"];

describe("карточки — разметка", () => {
  for (const file of ["cases.html", "articles.html"]) {
    test(`${file}: четыре метки внутри карточки`, () => {
      const card = read(file).match(/<a class="content-card"[\s\S]*?<\/a>/);
      assert.ok(card, "есть .content-card");
      for (const corner of CORNERS) {
        assert.match(
          card[0],
          new RegExp(`<span class="content-card__mark content-card__mark--${corner}" aria-hidden="true"></span>`)
        );
      }
    });
  }
});

describe("карточки — поведение", () => {
  let browser;
  let page;
  before(async () => {
    browser = await launch();
    page = await browser.newPage();
  });
  after(async () => {
    page.close();
    await browser.close();
  });

  const measure = `(() => {
    const card = document.querySelector(".content-card");
    const cs = getComputedStyle(card);
    const mark = (c) => card.querySelector(".content-card__mark--" + c);
    const tl = getComputedStyle(mark("tl"));
    return {
      cardWidth: card.getBoundingClientRect().width,
      cardHeight: card.getBoundingClientRect().height,
      border: cs.borderTopWidth,
      radius: cs.borderTopLeftRadius,
      transform: cs.transform,
      outline: cs.outlineStyle + " " + cs.outlineWidth,
      width: parseFloat(tl.width),
      height: parseFloat(tl.height),
      opacity: tl.opacity,
      shift: tl.transform,
      gap: mark("tr").getBoundingClientRect().left - mark("tl").getBoundingClientRect().right,
      focused: document.activeElement === card,
    };
  })()`;

  test("в покое: без рамки и скругления, метки 18px и приглушены", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const m = await page.eval(measure);
    assert.equal(m.border, "0px");
    assert.equal(m.radius, "0px");
    assert.equal(m.width, 18);
    assert.equal(m.opacity, "0.6");
  });

  test("при наведении метки растут, но посередине остаётся просвет; подъёма нет", async () => {
    await page.goto("/cases.html", { width: 1440 });
    await page.hover(".content-card");
    await page.wait(300);
    const m = await page.eval(measure);
    assert.ok(Math.abs(m.width - (m.cardWidth / 2 - 28)) <= 1, `ширина метки ${m.width}`);
    assert.ok(Math.abs(m.height - (m.cardHeight / 2 - 20)) <= 1, `высота метки ${m.height}`);
    assert.equal(m.opacity, "1");
    assert.equal(m.shift, "matrix(1, 0, 0, 1, -4, -4)");
    assert.ok(m.gap >= 40, `просвет между метками ${m.gap}px`);
    assert.equal(m.transform, "none");
  });

  test("фокус с клавиатуры: метки растут и видна медная обводка", async () => {
    await page.goto("/cases.html", { width: 1440 });
    await page.eval("localStorage.setItem('abra-cookie-consent', '1')");
    await page.goto("/cases.html", { width: 1440 });
    let m;
    for (let i = 0; i < 20; i++) {
      await page.press("Tab");
      m = await page.eval(measure);
      if (m.focused) break;
    }
    assert.ok(m.focused, "карточка достижима с клавиатуры");
    await page.wait(700);
    m = await page.eval(measure);
    assert.equal(m.outline, "solid 1px");
    assert.ok(m.width > 18);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vite build --logLevel error && node --test tests/cards.test.mjs`

Expected: FAIL — нет `.content-card__mark`; в браузере у карточки `borderTopWidth` = `1px`.

- [ ] **Step 3: Разметка меток**

```bash
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
const marks = ["tl", "tr", "bl", "br"]
  .map((c) => `          <span class="content-card__mark content-card__mark--${c}" aria-hidden="true"></span>`)
  .join("\n");
for (const file of ["cases.html", "articles.html"]) {
  const html = readFileSync(file, "utf8");
  const pattern = /(<a class="content-card" href="[^"]+">\n)/g;
  const count = (html.match(pattern) || []).length;
  if (count !== 1) throw new Error(`${file}: .content-card найден ${count} раз`);
  writeFileSync(file, html.replace(pattern, `$1${marks}\n`));
  console.log("ok", file);
}
EOF
```

- [ ] **Step 4: CSS — карточка и метки**

Заменить блоки `.content-card { … }` и `.content-card:hover, .content-card:focus-visible { … }` (правила `__kicker`, `__title`, `__excerpt`, `__arrow` и сдвиг стрелки при наведении не трогать) на:

```css
.content-card {
  display: block;
  position: relative;
  padding: 28px 56px 28px 28px;
  /* isolate — фон ::before с z-index:-1 ложится под текст карточки,
     но над фоном страницы. */
  isolation: isolate;
}

/* Вместо скруглённой рамки — фон и метки по углам. В покое метки
   приглушены; при наведении и фокусе тянутся друг к другу, но посередине
   сторон всегда остаётся просвет — как у скобок .abra-cta. Карточка не
   поднимается: движение несут метки. */
.content-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bg-warm);
  opacity: 0.55;
  transition: opacity 260ms ease;
}

.content-card__mark {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 0 solid var(--accent);
  opacity: 0.6;
  pointer-events: none;
  transition: width 360ms cubic-bezier(0.2, 0.8, 0.2, 1) 40ms,
    height 360ms cubic-bezier(0.2, 0.8, 0.2, 1) 40ms,
    transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 260ms ease;
}

.content-card__mark--tl {
  top: 0;
  left: 0;
  border-top-width: 1px;
  border-left-width: 1px;
}

.content-card__mark--tr {
  top: 0;
  right: 0;
  border-top-width: 1px;
  border-right-width: 1px;
}

.content-card__mark--bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 1px;
  border-left-width: 1px;
}

.content-card__mark--br {
  bottom: 0;
  right: 0;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.content-card:hover::before,
.content-card:focus-visible::before {
  opacity: 1;
}

.content-card:hover .content-card__mark,
.content-card:focus-visible .content-card__mark {
  width: calc(50% - 28px);
  height: calc(50% - 20px);
  opacity: 1;
}

.content-card:hover .content-card__mark--tl,
.content-card:focus-visible .content-card__mark--tl {
  transform: translate(-4px, -4px);
}

.content-card:hover .content-card__mark--tr,
.content-card:focus-visible .content-card__mark--tr {
  transform: translate(4px, -4px);
}

.content-card:hover .content-card__mark--bl,
.content-card:focus-visible .content-card__mark--bl {
  transform: translate(-4px, 4px);
}

.content-card:hover .content-card__mark--br,
.content-card:focus-visible .content-card__mark--br {
  transform: translate(4px, 4px);
}

@media (prefers-reduced-motion: reduce) {
  .content-card::before,
  .content-card__mark,
  .content-card__arrow {
    transition: none;
  }
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`

Expected: `# fail 0`, включая `smoke.test.mjs` на 320px (метки смещаются наружу на 4px и не должны расширять страницу).

- [ ] **Step 6: `CLAUDE.md` — «Страницы-списки»**

В предложении про компонент заменить фрагмент `— токены те же, что у `.card` на главной (`--bg-warm`/`--border`/radius/hover-lift), новых цветов нет.` на:

```
— без рамки и скругления: фон `--bg-warm` через `::before` и четыре метки по углам `.content-card__mark`. При наведении и фокусе метки тянутся друг к другу, но посередине сторон остаётся просвет, как у скобок `.abra-cta`; карточка не поднимается. Новых цветов нет. Метки — первые потомки `<a class="content-card">`, у новой карточки их нужно добавить руками.
```

- [ ] **Step 7: Посмотреть глазами**

Дев-сервер: `/cases` и `/articles` на 1440 и 390. Навести курсор на карточку на 1440, дойти до неё клавишей Tab. Ожидаемо: в покое — тонкие медные уголки, при наведении они тянутся вдоль сторон, посередине остаётся просвет, карточка на месте, при фокусе видна медная обводка.

- [ ] **Step 8: Commit**

```bash
git add tests/cards.test.mjs cases.html articles.html src/style.css CLAUDE.md
git commit -m "Replace rounded content cards with corner marks that reach toward each other

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Сдача этапа C**

Показать владельцу карточки и спросить разрешение на выкладку. **Без явного «да» — не сливать и не пушить.** После «да»:

```bash
git checkout main
git merge --ff-only feat/nav-button-system
git push origin main
gh run watch "$(gh run list --workflow deploy-vps.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
npm run build >/dev/null && ls dist/assets/ | grep '^main-'
curl -s https://a-bra.ru/ | grep -o 'assets/main-[^"]*\.js'
git branch -d feat/nav-button-system
```

Expected: прогон деплоя успешен, имя `main-*.js` на проде совпадает с локальной сборкой, ветка удалена.

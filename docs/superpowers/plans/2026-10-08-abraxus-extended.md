# ABRAXUS EXTENDED Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плагин темы Hermes Desktop `abraxus-extended`: точная тёмная палитра из `hermes-theme/tokens.json`, Inter, медная заливка, знак ABRA на заставке нового чата (вариант B) и в строке статуса (вариант A).

**Architecture:** Один ESM-файл `hermes-theme/extended/plugin.js` без сборки на стороне Hermes. Цвета живут в блоке `ABX` между маркерами `// <tokens>` и `// </tokens>`; блок пишет `build.mjs` из `tokens.json`. Тесты и `check.mjs` грузят плагин в Node, подменяя `@hermes/plugin-sdk`, `react` и `react/jsx-runtime` заглушками через `module.registerHooks` (`load-plugin.mjs`).

**Tech Stack:** Node 26 (`node:test`, `node:module` `registerHooks`), чистый ESM, React через `jsx()`/`jsxs()` без JSX-синтаксиса, Hermes Desktop Plugin SDK.

**Spec:** `docs/superpowers/specs/2026-10-08-abraxus-extended-design.md`

## Global Constraints

- Имя темы и `id` плагина — `abraxus-extended`; `label` — `ABRAXUS`; имя ≠ `abraxus` (это YAML-скин STANDARD).
- Папка установки: `~/.hermes/desktop-plugins/abraxus-extended/plugin.js` — имя папки обязано совпадать с `id`.
- Импорты в `plugin.js` — только `@hermes/plugin-sdk`, `react`, `react/jsx-runtime` (загрузчик Hermes отвергает остальное). JSX-синтаксиса нет.
- Цвета в `plugin.js` — только из `ABX`; новых цветов нет; блок руками не правится.
- Только тёмная тема: `colors` и `darkColors` — один и тот же объект.
- `customCSS` — ровно два блока: `:root` с `--dt-primary-solid`/`--dt-primary-solid-foreground` и правило заставки по `[data-slot="aui_intro"] .wordmark` (+ его `@media (prefers-reduced-motion: reduce)`); размер < 32 768 байт.
- Шрифт интерфейса — Inter 400/500/600 c `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap`; Syne нет.
- Путь знака: `M 6 155 L 82 75 A 44 44 0 1 0 18 75 L 94 155 Z` (`public/mark.svg`); центр кольца — (50; 44,8).
- Скрипты — Node без зависимостей; `hermes-theme/` не входит в сборку сайта.
- Коммиты — на английском, с строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push не делаем (push в `main` делает владелец).
- В рабочий Hermes (`~/.hermes`) ничего не ставится до явной команды владельца (Task 7).

## Review Focus

- **Повторный новый чат подряд:** SVG-картинка фона может делить таймлайн анимации между показами, и отрисовка контура не повторится — ожидается, что знак хотя бы виден целиком и штрих бежит. Тестом не ловится; ручная проверка в Task 7, шаг 4.
- **Тему сменили, пока агент работает:** знак в строке статуса должен исчезнуть сразу, без «зависшей» точки — тест в Task 3.
- **«Уменьшить движение» включили при открытом приложении:** знак должен перестать вращаться без перезапуска (подписка на `change` у `matchMedia`) — тест в Task 3.
- **Плагин выключили или перезагрузили:** внедрённый `<style>` строки статуса должен удалиться, без дублей при повторной загрузке — тест в Task 3.
- **Нет интернета:** вместо Inter — системный шрифт, а не Times; в `fontSans` после Inter обязаны стоять системные стеки — тест в Task 2.

---

## File Structure

| Файл | Ответственность |
|---|---|
| `hermes-theme/extended/build.mjs` | роли Hermes → токены; сборка объекта `ABX`; чтение/запись блока в `plugin.js`; CLI `node build.mjs [--check]` |
| `hermes-theme/extended/plugin.js` | сам плагин: блок `ABX`, тема, `customCSS`, SVG заставки, компонент `StatusMark`, регистрация |
| `hermes-theme/extended/load-plugin.mjs` | загрузка `plugin.js` в Node с заглушками SDK/React для тестов и `check.mjs` |
| `hermes-theme/extended/test/build.test.mjs` | тесты `build.mjs` |
| `hermes-theme/extended/test/plugin.test.mjs` | тесты темы, CSS и `StatusMark` |
| `hermes-theme/extended/check.mjs` | проверки из спецификации против установленного Hermes |
| `hermes-theme/extended/preview.html` | превью заставки и строки статуса |
| `hermes-theme/extended/INSTALL.md` | установка, обновление, удаление |
| `hermes-theme/README.md`, `CLAUDE.md` | статус EXTENDED |

Тесты запускаются так: `node --test hermes-theme/extended/test/` (из корня репозитория).

---

### Task 1: Сборка блока токенов

**Files:**
- Create: `hermes-theme/extended/build.mjs`
- Create: `hermes-theme/extended/plugin.js` (заготовка с маркерами)
- Test: `hermes-theme/extended/test/build.test.mjs`

**Interfaces:**
- Consumes: `hermes-theme/tokens.json` (`base`/`derived`, у каждого токена поле `value`).
- Produces:
  - `ROLES: { colors, terminal, mark, solid }` — объекты «роль → имя токена».
  - `flattenTokens(json): Record<string, string>` — имя токена → `#RRGGBB` в верхнем регистре.
  - `buildAbx(json): { colors, terminal, mark: { stroke, signal }, solid: { fill, ink } }` — бросает `Error` с текстом `Нет токена «<имя>» для <группа>.<роль>`.
  - `readBlock(source: string): object` — объект `ABX` из текста плагина.
  - `writeBlock(source: string, abx: object): string` — текст плагина с новым блоком.
  - `BEGIN = '// <tokens>'`, `END = '// </tokens>'`, `TOKENS_FILE`, `PLUGIN_FILE`.
  - CLI: `node hermes-theme/extended/build.mjs` пишет блок; `--check` → код 1, если блок отстал.

- [ ] **Step 1: Write the failing test**

`hermes-theme/extended/test/build.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { BEGIN, END, ROLES, TOKENS_FILE, buildAbx, flattenTokens, readBlock, writeBlock } from '../build.mjs'

const tokensJson = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'))

test('flattenTokens сводит base и derived в имя → hex', () => {
  const flat = flattenTokens(tokensJson)
  assert.equal(flat.bg, '#0C0B09')
  assert.equal(flat['line-control'], '#63615D')
  assert.equal(flat['bad-text'], '#C07460')
})

test('buildAbx раскладывает токены по ролям Hermes', () => {
  const abx = buildAbx(tokensJson)
  assert.equal(abx.colors.background, '#0C0B09')
  assert.equal(abx.colors.input, '#63615D')
  assert.equal(abx.colors.primary, '#B87333')
  assert.equal(abx.colors.primaryForeground, '#0C0B09')
  assert.equal(abx.terminal.blue, '#6E86A0')
  assert.equal(abx.terminal.brightWhite, '#EDEBE6')
  assert.deepEqual(abx.mark, { stroke: '#B87333', signal: '#EDEBE6' })
  assert.deepEqual(abx.solid, { fill: '#B87333', ink: '#0C0B09' })
  for (const [group, roles] of Object.entries(ROLES)) {
    assert.deepEqual(Object.keys(abx[group]).sort(), Object.keys(roles).sort(), group)
  }
})

test('buildAbx падает понятной ошибкой, если токена нет', () => {
  const broken = structuredClone(tokensJson)
  delete broken.derived['line-control']
  assert.throws(() => buildAbx(broken), /Нет токена «line-control» для colors\.input/)
})

test('writeBlock заменяет только блок, readBlock читает его обратно', () => {
  const source = `head\n${BEGIN}\nconst ABX = {}\n${END}\ntail\n`
  const abx = buildAbx(tokensJson)
  const next = writeBlock(source, abx)
  assert.ok(next.startsWith('head\n'))
  assert.ok(next.endsWith('\ntail\n'))
  assert.deepEqual(readBlock(next), abx)
  assert.equal(writeBlock(next, abx), next, 'повторная запись ничего не меняет')
})

test('writeBlock без маркеров — ошибка', () => {
  assert.throws(() => writeBlock('no markers', {}), /нет блока \/\/ <tokens>/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test hermes-theme/extended/test/`
Expected: FAIL — `Cannot find module '.../hermes-theme/extended/build.mjs'`.

- [ ] **Step 3: Write minimal implementation**

`hermes-theme/extended/build.mjs`:

```js
#!/usr/bin/env node
// Вписывает цвета из hermes-theme/tokens.json в блок // <tokens> плагина.
//   node hermes-theme/extended/build.mjs          — переписать блок
//   node hermes-theme/extended/build.mjs --check  — код 1, если блок отстал
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const TOKENS_FILE = join(HERE, '..', 'tokens.json')
export const PLUGIN_FILE = join(HERE, 'plugin.js')
export const BEGIN = '// <tokens>'
export const END = '// </tokens>'

// Роль Hermes → имя токена. Единственное место, где решается, какой цвет куда.
export const ROLES = {
  colors: {
    background: 'bg',
    foreground: 'text',
    card: 'bg-warm',
    cardForeground: 'text',
    muted: 'bg-warm',
    mutedForeground: 'muted',
    popover: 'bg-warm',
    popoverForeground: 'text',
    primary: 'accent',
    primaryForeground: 'bg',
    secondary: 'accent-fill',
    secondaryForeground: 'snow',
    accent: 'accent-fill',
    accentForeground: 'snow',
    border: 'line-surface',
    input: 'line-control',
    ring: 'accent',
    midground: 'accent',
    midgroundForeground: 'bg',
    composerRing: 'accent',
    destructive: 'bad-text',
    destructiveForeground: 'bg',
    sidebarBackground: 'bg',
    sidebarBorder: 'line-surface',
    userBubble: 'bg-warm',
    userBubbleBorder: 'line-surface'
  },
  terminal: {
    foreground: 'text',
    cursor: 'accent',
    selectionBackground: 'accent-fill',
    black: 'bg-warm',
    red: 'bad-text',
    green: 'ok',
    yellow: 'warn',
    blue: 'info',
    magenta: 'accent',
    cyan: 'accent-tint',
    white: 'text',
    brightBlack: 'muted',
    brightRed: 'bad-text',
    brightGreen: 'ok',
    brightYellow: 'warn',
    brightBlue: 'info',
    brightMagenta: 'accent',
    brightCyan: 'accent-tint',
    brightWhite: 'snow'
  },
  mark: { stroke: 'accent', signal: 'snow' },
  solid: { fill: 'accent', ink: 'bg' }
}

export function flattenTokens(json) {
  const out = {}
  for (const group of ['base', 'derived']) {
    for (const [name, token] of Object.entries(json[group])) out[name] = token.value.toUpperCase()
  }
  return out
}

export function buildAbx(json) {
  const tokens = flattenTokens(json)
  const abx = {}
  for (const [group, roles] of Object.entries(ROLES)) {
    abx[group] = {}
    for (const [role, name] of Object.entries(roles)) {
      if (!(name in tokens)) throw new Error(`Нет токена «${name}» для ${group}.${role}`)
      abx[group][role] = tokens[name]
    }
  }
  return abx
}

function blockRange(source) {
  const start = source.indexOf(BEGIN)
  const end = source.indexOf(END)
  if (start < 0 || end < start) throw new Error('В plugin.js нет блока // <tokens> … // </tokens>')
  return [start, end + END.length]
}

export function readBlock(source) {
  const [start, end] = blockRange(source)
  const body = source.slice(start, end)
  return JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1))
}

export function writeBlock(source, abx) {
  const [start, end] = blockRange(source)
  const block = `${BEGIN}\n// Пишет build.mjs из hermes-theme/tokens.json — руками не править.\nconst ABX = ${JSON.stringify(abx, null, 2)}\n${END}`
  return source.slice(0, start) + block + source.slice(end)
}

function main(argv) {
  const abx = buildAbx(JSON.parse(readFileSync(TOKENS_FILE, 'utf8')))
  const source = readFileSync(PLUGIN_FILE, 'utf8')
  const next = writeBlock(source, abx)
  if (argv.includes('--check')) {
    if (next !== source) {
      console.error('FAIL plugin.js отстал от tokens.json — запустите: node hermes-theme/extended/build.mjs')
      return 1
    }
    console.log('ok   блок токенов в plugin.js совпадает с tokens.json')
    return 0
  }
  if (next !== source) writeFileSync(PLUGIN_FILE, next)
  console.log(next === source ? 'plugin.js уже актуален' : 'plugin.js обновлён из tokens.json')
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2))
```

Заготовка `hermes-theme/extended/plugin.js` (её дополнят Task 2 и 3):

```js
// ABRAXUS EXTENDED — тема Hermes Desktop на дизайн-токенах a-bra.ru.
// Источник — hermes-theme/extended/plugin.js в репозитории сайта; ставится копией в
// ~/.hermes/desktop-plugins/abraxus-extended/plugin.js (см. INSTALL.md рядом).
// Цвета берутся только из блока ABX ниже — его пишет build.mjs из tokens.json.

// <tokens>
const ABX = {}
// </tokens>
```

- [ ] **Step 4: Run tests and the build**

Run: `node --test hermes-theme/extended/test/`
Expected: PASS, 5 tests.

Run: `node hermes-theme/extended/build.mjs && node hermes-theme/extended/build.mjs --check`
Expected: `plugin.js обновлён из tokens.json`, затем `ok   блок токенов в plugin.js совпадает с tokens.json`; в `plugin.js` блок `const ABX = { "colors": { "background": "#0C0B09", …`.

- [ ] **Step 5: Commit**

```bash
git add hermes-theme/extended/build.mjs hermes-theme/extended/plugin.js hermes-theme/extended/test/build.test.mjs
git commit -m "Add ABRAXUS Extended token build that writes tokens.json into the plugin" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Тема, CSS и знак на заставке

**Files:**
- Create: `hermes-theme/extended/load-plugin.mjs`
- Modify: `hermes-theme/extended/plugin.js`
- Test: `hermes-theme/extended/test/plugin.test.mjs`

**Interfaces:**
- Consumes: блок `ABX` из Task 1 (`ABX.colors`, `ABX.terminal`, `ABX.mark.stroke`, `ABX.mark.signal`, `ABX.solid.fill`, `ABX.solid.ink`).
- Produces (именованные экспорты `plugin.js`, используются тестами и `check.mjs`):
  - `THEME_NAME = 'abraxus-extended'`, `MARK_PATH`, `INTRO_SELECTOR = '[data-slot="aui_intro"] .wordmark'`.
  - `splashSvg(animated: boolean): string` — SVG-разметка знака.
  - `CUSTOM_CSS: string`, `THEME: DesktopTheme`.
  - `default: { id, name, register(ctx) }` — пока регистрирует только тему.
- Produces (`load-plugin.mjs`):
  - `sdkState(over?: object): object` — сбрасывает заглушку SDK: `{ themeName: 'abraxus-extended', busy: false, effects: [] , ...over }` в `globalThis.__abxSdk`.
  - `loadPlugin(): Promise<{ mod, plugin, contributions, disposers }>` — импортирует свежую копию `plugin.js` и вызывает `register` с фейковым `ctx`.

- [ ] **Step 1: Write the loader**

`hermes-theme/extended/load-plugin.mjs`:

```js
// Загружает plugin.js в Node без Hermes: подменяет @hermes/plugin-sdk, react и
// react/jsx-runtime заглушками. Нужен тестам и check.mjs, в Hermes не ставится.
import { registerHooks } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const PLUGIN_FILE = join(dirname(fileURLToPath(import.meta.url)), 'plugin.js')

const STUBS = {
  '@hermes/plugin-sdk': `
    const s = () => globalThis.__abxSdk
    export const THEMES_AREA = 'themes'
    export const STATUSBAR_AREAS = { left: 'statusBar.left', right: 'statusBar.right' }
    export const host = { state: { busy: 'busy-atom' } }
    export const useTheme = () => ({ themeName: s().themeName })
    export const useValue = atom => (atom === 'busy-atom' ? s().busy : undefined)`,
  react: `
    const s = () => globalThis.__abxSdk
    export const useState = init => [typeof init === 'function' ? init() : init, value => { s().lastSet = value }]
    export const useEffect = fn => { s().effects.push(fn) }`,
  'react/jsx-runtime': `
    export const jsx = (type, props) => ({ type, props })
    export const jsxs = jsx`
}

let hooked = false

function installHooks() {
  if (hooked) return
  hooked = true
  registerHooks({
    resolve(specifier, context, next) {
      return specifier in STUBS ? { url: `abx-stub:${specifier}`, shortCircuit: true } : next(specifier, context)
    },
    load(url, context, next) {
      return url.startsWith('abx-stub:')
        ? { format: 'module', source: STUBS[url.slice('abx-stub:'.length)], shortCircuit: true }
        : next(url, context)
    }
  })
}

export function sdkState(over = {}) {
  globalThis.__abxSdk = { themeName: 'abraxus-extended', busy: false, effects: [], ...over }
  return globalThis.__abxSdk
}

let loads = 0

export async function loadPlugin() {
  installHooks()
  sdkState()
  const mod = await import(`${pathToFileURL(PLUGIN_FILE).href}?load=${++loads}`)
  const contributions = []
  const disposers = []
  const ctx = {
    source: 'plugin:abraxus-extended',
    register: c => {
      contributions.push(c)
      return () => {}
    },
    onDispose: fn => disposers.push(fn)
  }
  mod.default.register(ctx)
  return { mod, plugin: mod.default, contributions, disposers }
}
```

- [ ] **Step 2: Write the failing test**

`hermes-theme/extended/test/plugin.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { readBlock } from '../build.mjs'
import { PLUGIN_FILE, loadPlugin } from '../load-plugin.mjs'

const ABX = readBlock(readFileSync(PLUGIN_FILE, 'utf8'))
const decodeUrls = css => [...css.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\)/g)].map(m => decodeURIComponent(m[1]))

test('плагин регистрирует тему ABRAXUS с палитрой из ABX', async () => {
  const { plugin, contributions } = await loadPlugin()
  assert.equal(plugin.id, 'abraxus-extended')
  const theme = contributions.find(c => c.area === 'themes')?.data
  assert.ok(theme, 'тема зарегистрирована')
  assert.equal(theme.name, 'abraxus-extended')
  assert.equal(theme.label, 'ABRAXUS')
  assert.deepEqual(theme.colors, ABX.colors)
  assert.equal(theme.darkColors, theme.colors, 'одна тёмная палитра на оба режима')
  assert.deepEqual(theme.terminal, ABX.terminal)
  assert.equal(theme.darkTerminal, theme.terminal)
})

test('Inter с системным запасным стеком', async () => {
  const { mod } = await loadPlugin()
  const { fontSans, fontMono, fontUrl } = mod.THEME.typography
  assert.match(fontSans, /^Inter, /)
  assert.match(fontSans, /system-ui, sans-serif/, 'без сети — системный шрифт, а не Times')
  assert.doesNotMatch(fontSans, /Syne/)
  assert.match(fontMono, /^"JetBrains Mono"/)
  assert.equal(fontUrl, 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap')
})

test('медная заливка — переменные с !important', async () => {
  const { mod } = await loadPlugin()
  assert.match(mod.CUSTOM_CSS, new RegExp(`--dt-primary-solid: ${ABX.solid.fill} !important;`))
  assert.match(mod.CUSTOM_CSS, new RegExp(`--dt-primary-solid-foreground: ${ABX.solid.ink} !important;`))
})

test('в CSS только :root и правило заставки', async () => {
  const { mod } = await loadPlugin()
  const selectors = [...mod.CUSTOM_CSS.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
  for (const selector of selectors) {
    assert.ok(
      selector === ':root' ||
        selector.startsWith(mod.INTRO_SELECTOR) ||
        selector === '@media (prefers-reduced-motion: reduce)',
      `лишний селектор: ${selector}`
    )
  }
  assert.ok(Buffer.byteLength(mod.CUSTOM_CSS) < 32768)
})

test('заставка: анимированный знак и статичный для «Уменьшить движение»', async () => {
  const { mod } = await loadPlugin()
  const [animated, still] = decodeUrls(mod.CUSTOM_CSS)
  assert.ok(animated.includes(`d="${mod.MARK_PATH}"`))
  assert.ok(animated.includes('@keyframes'), 'есть анимация')
  assert.ok(animated.includes(`stroke="${ABX.mark.signal}"`), 'светлый штрих')
  assert.ok(still.includes(`stroke="${ABX.mark.stroke}"`))
  assert.ok(!still.includes('@keyframes'), 'статичный знак без анимации')
  const media = mod.CUSTOM_CSS.slice(mod.CUSTOM_CSS.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.equal(decodeUrls(media)[0], still, 'статичный знак — внутри медиазапроса')
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test hermes-theme/extended/test/`
Expected: FAIL — `plugin.default` не определён (`Cannot read properties of undefined (reading 'register')`).

- [ ] **Step 4: Write minimal implementation**

Дописать в `hermes-theme/extended/plugin.js` — импорт поставить первой строкой кода (сразу после шапки-комментария, до блока токенов), остальное — после `// </tokens>`:

```js
import { THEMES_AREA } from '@hermes/plugin-sdk'
```

```js
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
@media (prefers-reduced-motion: reduce) {
  ${INTRO_SELECTOR} {
    background-image: ${svgUrl(splashSvg(false))};
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

export default {
  id: THEME_NAME,
  name: 'ABRAXUS',
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: THEME })
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test hermes-theme/extended/test/ && node hermes-theme/extended/build.mjs --check && node --check hermes-theme/extended/plugin.js`
Expected: PASS, 10 tests; `ok   блок токенов…`; `node --check` без вывода.

- [ ] **Step 6: Commit**

```bash
git add hermes-theme/extended/load-plugin.mjs hermes-theme/extended/plugin.js hermes-theme/extended/test/plugin.test.mjs
git commit -m "Add ABRAXUS Extended theme with Inter, copper fill and splash mark" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Знак в строке статуса

**Files:**
- Modify: `hermes-theme/extended/plugin.js`
- Test: `hermes-theme/extended/test/plugin.test.mjs` (дописать)

**Interfaces:**
- Consumes: `THEME_NAME`, `MARK_PATH`, `ABX.mark` (Task 2); заглушки `sdkState`, `loadPlugin` (Task 2).
- Produces:
  - `StatusMark(): ReactElement | null` — экспорт `plugin.js`.
  - `STATUS_STYLE_ID = 'abraxus-extended-status'`.
  - регистрация `{ id: 'mark', area: STATUSBAR_AREAS.left, order: 0, render }` и `ctx.onDispose` для снятия `<style>`.

- [ ] **Step 1: Write the failing tests**

Дописать в `hermes-theme/extended/test/plugin.test.mjs` (импорт `sdkState` добавить в существующую строку импорта из `../load-plugin.mjs`):

```js
import { sdkState } from '../load-plugin.mjs'

// Разворачивает дерево jsx-заглушек: { type, props } → найти узел по типу.
const find = (node, type) => {
  if (!node || typeof node !== 'object') return null
  if (node.type === type) return node
  for (const child of [].concat(node.props?.children ?? [])) {
    const hit = find(child, type)
    if (hit) return hit
  }
  return null
}

const renderMark = async (over = {}) => {
  const { mod, contributions } = await loadPlugin()
  const mark = contributions.find(c => c.area === 'statusBar.left')
  const state = sdkState(over)
  const element = mark.render()
  return { mod, mark, state, tree: element.type(element.props) }
}

test('знак регистрируется в левой части строки статуса', async () => {
  const { mark } = await renderMark()
  assert.equal(mark.id, 'mark')
  assert.equal(mark.order, 0)
})

test('свободен: точка стоит, подпись «свободен»', async () => {
  const { tree } = await renderMark({ busy: false })
  assert.equal(tree.props['aria-label'], 'ABRAXUS — свободен')
  assert.equal(tree.props.title, 'ABRAXUS — свободен')
  assert.equal(tree.props.role, 'img')
  assert.equal(find(tree, 'g').props.className, 'abx-orbit')
  assert.equal(find(tree, 'circle').props.fill, ABX.mark.signal)
})

test('работает: орбита вращается', async () => {
  const { tree } = await renderMark({ busy: true })
  assert.equal(tree.props['aria-label'], 'ABRAXUS — работает')
  assert.equal(find(tree, 'g').props.className, 'abx-orbit abx-orbit--spin')
})

test('другая тема — знака нет, даже если агент работает', async () => {
  const { tree } = await renderMark({ busy: true, themeName: 'nous' })
  assert.equal(tree, null)
})

test('«Уменьшить движение»: не вращается, при работе точка медная, подписка на change', async () => {
  const listeners = []
  globalThis.matchMedia = query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: () => {}
  })
  try {
    const { tree, state } = await renderMark({ busy: true })
    assert.equal(find(tree, 'g').props.className, 'abx-orbit')
    assert.equal(find(tree, 'circle').props.fill, ABX.mark.stroke)
    state.effects.forEach(fn => fn())
    assert.equal(listeners[0][0], 'change', 'реагирует на переключение без перезапуска')
    listeners[0][1]({ matches: false })
    assert.equal(state.lastSet, false)
  } finally {
    delete globalThis.matchMedia
  }
})

test('<style> строки статуса внедряется один раз и снимается при выключении', async () => {
  const nodes = {}
  globalThis.document = {
    getElementById: id => nodes[id] ?? null,
    createElement: () => {
      const el = { remove: () => delete nodes[el.id] }
      return el
    },
    head: { appendChild: el => (nodes[el.id] = el) }
  }
  try {
    const first = await loadPlugin()
    await loadPlugin()
    const style = nodes['abraxus-extended-status']
    assert.ok(style, 'стиль внедрён')
    assert.match(style.textContent, /@keyframes abx-orbit/)
    assert.match(style.textContent, /transform-origin:50px 44\.8px/)
    first.disposers.forEach(fn => fn())
    assert.equal(nodes['abraxus-extended-status'], undefined, 'снят при выключении')
  } finally {
    delete globalThis.document
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test hermes-theme/extended/test/`
Expected: FAIL — `Cannot read properties of undefined (reading 'id')` (знака в строке статуса ещё нет).

- [ ] **Step 3: Write minimal implementation**

В `hermes-theme/extended/plugin.js` заменить строку импорта SDK и добавить импорты React:

```js
import { host, STATUSBAR_AREAS, THEMES_AREA, useTheme, useValue } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
```

Перед `export default` добавить:

```js
// Строка статуса (вариант A): точка-спутник над кольцом знака. Агент свободен —
// стоит; работает — обходит кольцо за 1,6 с. «Уменьшить движение» — не вращается,
// при работе становится медной.
export const STATUS_STYLE_ID = 'abraxus-extended-status'
const STATUS_VIEWBOX = '-18 -22 136 195'
const STATUS_CSS =
  '.abx-orbit{transform-box:view-box;transform-origin:50px 44.8px}' +
  '.abx-orbit--spin{animation:abx-orbit 1.6s linear infinite}' +
  '@keyframes abx-orbit{to{transform:rotate(360deg)}}'

function injectStatusStyle() {
  if (typeof document === 'undefined') return () => {}
  let el = document.getElementById(STATUS_STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STATUS_STYLE_ID
    el.textContent = STATUS_CSS
    document.head.appendChild(el)
  }
  return () => el.remove()
}

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

export function StatusMark() {
  const { themeName } = useTheme()
  const busy = useValue(host.state.busy)
  const reduce = useReducedMotion()
  if (themeName !== THEME_NAME) return null
  const label = busy ? 'ABRAXUS — работает' : 'ABRAXUS — свободен'
  return jsx('span', {
    role: 'img',
    'aria-label': label,
    title: label,
    style: { display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 6px' },
    children: jsxs('svg', {
      width: 12,
      height: 18,
      viewBox: STATUS_VIEWBOX,
      'aria-hidden': true,
      children: [
        jsx('path', {
          d: MARK_PATH,
          fill: 'none',
          stroke: ABX.mark.stroke,
          strokeWidth: 12,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }),
        jsx('g', {
          className: busy && !reduce ? 'abx-orbit abx-orbit--spin' : 'abx-orbit',
          children: jsx('circle', { cx: 50, cy: -8, r: 10, fill: busy && reduce ? ABX.mark.stroke : ABX.mark.signal })
        })
      ]
    })
  })
}
```

В `register` после регистрации темы добавить:

```js
    ctx.onDispose(injectStatusStyle())
    ctx.register({ id: 'mark', area: STATUSBAR_AREAS.left, order: 0, render: () => jsx(StatusMark, {}) })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test hermes-theme/extended/test/ && node hermes-theme/extended/build.mjs --check && node --check hermes-theme/extended/plugin.js`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add hermes-theme/extended/plugin.js hermes-theme/extended/test/plugin.test.mjs
git commit -m "Add ABRAXUS status bar mark that orbits while the agent works" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Проверки против установленного Hermes

**Files:**
- Create: `hermes-theme/extended/check.mjs`
- Modify: `docs/superpowers/specs/2026-10-08-abraxus-extended-design.md` (п. 4 «Проверок» и раздел «Плагин»: разрешённые импорты — `@hermes/plugin-sdk`, `react`, `react/jsx-runtime`; `useState`/`useEffect` нужны для подписки на «Уменьшить движение»)

**Interfaces:**
- Consumes: `buildAbx`, `writeBlock`, `readBlock`, `TOKENS_FILE` (Task 1); `loadPlugin`, `PLUGIN_FILE` (Task 2); экспорты плагина `THEME`, `CUSTOM_CSS`, `INTRO_SELECTOR` (Task 2).
- Produces: CLI `node hermes-theme/extended/check.mjs` — строки `ok   …` / `FAIL …`, итог, код 1 при ошибке. Путь к Hermes — `HERMES_AGENT_DIR` или `~/.hermes/hermes-agent`.

- [ ] **Step 1: Write the check script**

`hermes-theme/extended/check.mjs`:

```js
#!/usr/bin/env node
// Проверки ABRAXUS EXTENDED. Запускать после правки токенов и после каждого
// `hermes update`:  node ~/Documents/abrasite/hermes-theme/extended/check.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { TOKENS_FILE, buildAbx, readBlock, writeBlock } from './build.mjs'
import { PLUGIN_FILE, loadPlugin } from './load-plugin.mjs'

const HERMES = process.env.HERMES_AGENT_DIR || join(homedir(), '.hermes', 'hermes-agent')
const DESKTOP = join(HERMES, 'apps', 'desktop')
const DIST = join(DESKTOP, 'release', 'mac-arm64', 'Hermes.app', 'Contents', 'Resources', 'app.asar.unpacked', 'dist', 'assets')

let failures = 0
const check = (ok, message) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${message}`)
  if (!ok) failures += 1
}
const section = title => console.log(`\n── ${title}`)

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const luminance = hex => {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Поля интерфейса Hermes — из его исходников, а не переписанные вручную.
const interfaceKeys = (source, name) => {
  const body = source.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map(m => m[1])
}

section('1. Токены')
const source = readFileSync(PLUGIN_FILE, 'utf8')
const abx = buildAbx(JSON.parse(readFileSync(TOKENS_FILE, 'utf8')))
check(writeBlock(source, abx) === source, 'блок ABX в plugin.js совпадает со сборкой из tokens.json')

section('2. Тема')
const { mod, contributions } = await loadPlugin()
const theme = contributions.find(c => c.area === 'themes')?.data
check(Boolean(theme), 'тема зарегистрирована в THEMES_AREA')
check(theme?.name === 'abraxus-extended' && theme.name !== 'abraxus', `имя темы ${theme?.name} не совпадает с YAML-скином abraxus`)
check(theme?.label === 'ABRAXUS', 'название в списке тем — ABRAXUS')
const types = readFileSync(join(DESKTOP, 'src', 'themes', 'types.ts'), 'utf8')
const colorKeys = interfaceKeys(types, 'DesktopThemeColors')
const terminalKeys = interfaceKeys(types, 'DesktopTerminalPalette')
check(colorKeys.length > 20, `из types.ts прочитано ${colorKeys.length} цветовых полей`)
const missingColors = colorKeys.filter(k => !theme?.colors?.[k])
check(missingColors.length === 0, `заданы все цветовые поля${missingColors.length ? ': нет ' + missingColors.join(', ') : ''}`)
const missingTerminal = terminalKeys.filter(k => !theme?.terminal?.[k])
check(missingTerminal.length === 0, `заданы все цвета терминала${missingTerminal.length ? ': нет ' + missingTerminal.join(', ') : ''}`)
const allHex = [...Object.values(theme?.colors ?? {}), ...Object.values(theme?.terminal ?? {})]
check(allHex.every(v => /^#[0-9A-F]{6}$/.test(v)), 'все цвета — #RRGGBB')

section('3. Контраст (WCAG)')
const c = theme.colors
const pairs = [
  ['текст на фоне', c.foreground, c.background, 4.5],
  ['текст на карточке', c.cardForeground, c.card, 4.5],
  ['текст в пузыре', c.foreground, c.userBubble, 4.5],
  ['второстепенный текст', c.mutedForeground, c.background, 4.5],
  ['медь на фоне', c.primary, c.background, 4.5],
  ['медь на карточке', c.primary, c.card, 4.5],
  ['тёмный текст на медной кнопке', c.primaryForeground, c.primary, 4.5],
  ['поля и чекбоксы', c.input, c.background, 3],
  ['ошибка на фоне', c.destructive, c.background, 4.5],
  ['текст на подложке наведения', c.accentForeground, c.accent, 4.5]
]
for (const [what, fg, bg, need] of pairs) {
  const ratio = contrast(fg, bg)
  check(ratio >= need, `${what}: ${fg} / ${bg} = ${ratio.toFixed(2)}:1 (нужно ${need})`)
}

section('4. Код')
check(spawnSync(process.execPath, ['--check', PLUGIN_FILE]).status === 0, 'plugin.js синтаксически корректен')
const imports = [...source.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1])
const allowed = ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']
check(imports.every(i => allowed.includes(i)), `импорты только ${allowed.join(', ')}: ${imports.join(', ')}`)

section('5. CSS')
const selectors = [...mod.CUSTOM_CSS.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
const extra = selectors.filter(
  s => s !== ':root' && !s.startsWith(mod.INTRO_SELECTOR) && s !== '@media (prefers-reduced-motion: reduce)'
)
check(extra.length === 0, `селекторы только :root и заставка${extra.length ? ': лишние ' + extra.join(' | ') : ''}`)
const cssBytes = Buffer.byteLength(mod.CUSTOM_CSS)
check(cssBytes < 32768, `размер customCSS ${cssBytes} байт < 32 768`)

section('6. Совместимость с установленным Hermes')
const sdk = readFileSync(join(DESKTOP, 'src', 'sdk', 'index.ts'), 'utf8')
for (const [what, pattern] of [
  ['THEMES_AREA', /export \{ THEMES_AREA \}/],
  ['STATUSBAR_AREAS', /export \{[^}]*STATUSBAR_AREAS[^}]*\} from '\.\/areas'/],
  ['useTheme', /export \{ useTheme \}/],
  ['useValue', /useStore as useValue/],
  ['host', /^export const host = \{/m],
  ['host.state.busy', /^\s+busy: readonlyAtom<boolean>/m]
]) {
  check(pattern.test(sdk), `SDK экспортирует ${what}`)
}
if (!existsSync(DIST)) {
  check(false, `нет собранного Desktop в ${DIST}`)
} else {
  const bundle = readdirSync(DIST)
    .filter(f => f.endsWith('.js'))
    .map(f => readFileSync(join(DIST, f), 'utf8'))
    .join('\n')
  check(bundle.includes('aui_intro'), 'в сборке Desktop есть заставка data-slot="aui_intro"')
  check(bundle.includes('wordmark fit-text'), 'в сборке Desktop есть класс надписи wordmark')
}

console.log(`\n${failures ? 'ПРОВАЛ' : 'OK'}: ${failures} ошибок`)
process.exitCode = failures ? 1 : 0
```

- [ ] **Step 2: Run it against the real Hermes**

Run: `node hermes-theme/extended/check.mjs`
Expected: все строки `ok`, итог `OK: 0 ошибок`, код 0. Если какой-то пункт 6 падает — это расхождение с установленным Hermes: остановиться и сообщить, не подгонять проверку.

- [ ] **Step 3: Prove the check catches drift**

Run: `sed -i '' 's/"#63615D"/"#63615E"/' hermes-theme/extended/plugin.js && node hermes-theme/extended/check.mjs; echo "exit=$?"; node hermes-theme/extended/build.mjs`
Expected: `FAIL блок ABX в plugin.js совпадает…`, `exit=1`; затем `plugin.js обновлён из tokens.json` (блок восстановлен). Проверить: `git diff --stat hermes-theme/extended/plugin.js` — пусто.

- [ ] **Step 4: Fix the spec's import list**

В `docs/superpowers/specs/2026-10-08-abraxus-extended-design.md`:
- в разделе «Плагин `abraxus-extended`» строку `Разрешённые импорты — только \`@hermes/plugin-sdk\` и \`react/jsx-runtime\`.` заменить на `Разрешённые импорты — \`@hermes/plugin-sdk\`, \`react\` и \`react/jsx-runtime\` (так разрешает загрузчик Hermes; \`useState\`/\`useEffect\` нужны для подписки на «Уменьшить движение»).`;
- в «Проверках», п. 4, `только \`@hermes/plugin-sdk\` и \`react/jsx-runtime\`` заменить на `только \`@hermes/plugin-sdk\`, \`react\` и \`react/jsx-runtime\``.

- [ ] **Step 5: Commit**

```bash
git add hermes-theme/extended/check.mjs docs/superpowers/specs/2026-10-08-abraxus-extended-design.md
git commit -m "Add ABRAXUS Extended checks against the installed Hermes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Превью

**Files:**
- Create: `hermes-theme/extended/preview.html`
- Modify: `.claude/launch.json` — конфигурация `abraxus-preview` (статический сервер)

**Interfaces:**
- Consumes: `splashSvg`, `StatusMark` и регистрация из `plugin.js` — превью **не копирует** SVG и цвета, а импортирует плагин в браузере с заглушками через import map.
- Ограничение: Chrome не запускает ES-модули со страницы `file://`, а dev-сервер Vite переписывает голые импорты (`@hermes/plugin-sdk`) и падает. Поэтому превью отдаёт простой `python3 -m http.server` — он ничего не трансформирует, и import map работает.

- [ ] **Step 1: Write the preview**

`hermes-theme/extended/preview.html` — страница на `#0C0B09`, без внешних скриптов. Ключевые части:

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ABRAXUS Extended</title>
<script type="importmap">
{ "imports": {
  "@hermes/plugin-sdk": "data:text/javascript,export const THEMES_AREA='themes';export const STATUSBAR_AREAS={left:'statusBar.left'};export const host={state:{busy:'busy'}};export const useTheme=()=>({themeName:'abraxus-extended'});export const useValue=a=>globalThis.__busy;",
  "react": "data:text/javascript,export const useState=i=>[typeof i==='function'?i():i,()=>{}];export const useEffect=()=>{};",
  "react/jsx-runtime": "data:text/javascript,export const jsx=(type,props)=>({type,props});export const jsxs=jsx;"
} }
</script>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0C0B09; color: #CEC9C3; font: 15px/1.55 Inter, system-ui, sans-serif; }
  main { max-width: 1080px; margin: 0 auto; padding: 40px 20px 80px; }
  h1, h2 { color: #EDEBE6; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .panel { background: #131210; border: 1px solid #2B2927; border-radius: 6px; padding: 20px; }
  .splash { display: grid; justify-items: center; gap: 12px; padding: 32px 0; }
  .splash p { color: #84817C; margin: 0; }
  .bar { display: flex; align-items: center; gap: 10px; background: #131210; border-top: 1px solid #2B2927; padding: 4px 8px; font: 12px "JetBrains Mono", monospace; color: #84817C; }
  .note { color: #84817C; font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>ABRAXUS EXTENDED</h1>
  <p class="note">Знак, цвета и анимация — из самого plugin.js (импорт с заглушками SDK), не копия.</p>
  <h2>Заставка нового чата</h2>
  <div class="grid">
    <div class="panel"><div class="splash" id="splash-animated"></div><p class="note">Обычный режим: контур рисуется, затем бежит штрих</p></div>
    <div class="panel"><div class="splash" id="splash-still"></div><p class="note">«Уменьшить движение»: статичный знак</p></div>
  </div>
  <h2>Строка статуса</h2>
  <div class="grid">
    <div class="panel"><div class="bar" id="bar-idle"></div><p class="note">Агент свободен</p></div>
    <div class="panel"><div class="bar" id="bar-busy"></div><p class="note">Агент работает</p></div>
  </div>
</main>
<script type="module">
  import plugin, { splashSvg, StatusMark } from './plugin.js'

  for (const [id, animated] of [['splash-animated', true], ['splash-still', false]]) {
    document.getElementById(id).innerHTML =
      `<div style="width:116px;height:170px">${splashSvg(animated)}</div><p>Search the repo, edit files, run tests…</p>`
  }

  // Мини-рендер jsx-заглушек в DOM — только для превью.
  const SVG = 'http://www.w3.org/2000/svg'
  const attr = k => ({ className: 'class', strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin' })[k] ?? k
  const toDom = (node, svg = false) => {
    if (node == null) return document.createTextNode('')
    if (typeof node.type === 'function') return toDom(node.type(node.props), svg)
    const inSvg = svg || node.type === 'svg'
    const el = inSvg ? document.createElementNS(SVG, node.type) : document.createElement(node.type)
    for (const [k, v] of Object.entries(node.props ?? {})) {
      if (k === 'children') continue
      if (k === 'style') Object.assign(el.style, v)
      else el.setAttribute(attr(k), v)
    }
    for (const child of [].concat(node.props?.children ?? [])) el.append(toDom(child, inSvg))
    return el
  }

  plugin.register({ register: () => () => {}, onDispose: () => {} })
  for (const [id, busy] of [['bar-idle', false], ['bar-busy', true]]) {
    globalThis.__busy = busy
    const bar = document.getElementById(id)
    bar.append(toDom({ type: StatusMark, props: {} }))
    bar.insertAdjacentHTML('beforeend', '<b style="color:#CEC9C3">opus-5.5</b> │ ctx 22%')
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Add the static server config**

В `.claude/launch.json` добавить в `configurations`:

```json
{
  "name": "abraxus-preview",
  "runtimeExecutable": "python3",
  "runtimeArgs": ["-m", "http.server", "8765", "--bind", "127.0.0.1", "--directory", "hermes-theme/extended"],
  "port": 8765
}
```

В начало `<main>` превью добавить подсказку, видимую, если модуль не загрузился:

```html
<p class="note" id="served-hint">Если ниже пусто — страница открыта как файл. Откройте через сервер: <code>python3 -m http.server 8765 --directory ~/Documents/abrasite/hermes-theme/extended</code> и http://localhost:8765/preview.html</p>
```

а первой строкой модульного скрипта — `document.getElementById('served-hint').remove()`.

- [ ] **Step 3: Verify in the browser pane**

Run (через превью-инструменты, не Bash): `preview_start` с `name: "abraxus-preview"`, затем `navigate` на `http://localhost:8765/preview.html`.
Expected: `read_console_messages` без ошибок; на скриншоте — медный знак в двух панелях заставки (в левой бежит светлый штрих), в строке статуса два маленьких знака: в «работает» точка вращается (проверить двумя скриншотами с паузой 1 с или `javascript_tool`: `getComputedStyle(document.querySelector('#bar-busy .abx-orbit--spin')).animationName === 'abx-orbit'`).

- [ ] **Step 4: Commit**

`.claude/launch.json` в коммит не включать, если в нём есть посторонние незакоммиченные правки (проверить `git diff .claude/launch.json`); иначе — включить.

```bash
git add hermes-theme/extended/preview.html
git commit -m "Add ABRAXUS Extended preview rendered from the plugin itself" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Документация

**Files:**
- Create: `hermes-theme/extended/INSTALL.md`
- Modify: `hermes-theme/README.md` (раздел «Два этапа» и «Правило палитры»)
- Modify: `CLAUDE.md` — только строка `hermes-theme/` в «Структуре файлов» (в файле есть чужие незакоммиченные правки — коммитить только этот фрагмент, как в коммите `950bb8b`: собрать индекс из `HEAD:CLAUDE.md` + новая строка)

- [ ] **Step 1: Write INSTALL.md**

`hermes-theme/extended/INSTALL.md` — разделы и команды (все пути полные, чтобы работали из любой папки):

````markdown
# ABRAXUS EXTENDED — установка, обновление, удаление

Плагин — один файл `plugin.js`. Hermes подхватывает его без перезапуска. STANDARD (`abraxus.yaml`) не трогается и остаётся для терминала.

## 0. Проверить

```bash
node ~/Documents/abrasite/hermes-theme/extended/check.mjs
```

Должно закончиться `OK: 0 ошибок`.

## 1. Установить

```bash
ls ~/.hermes/desktop-plugins/abraxus-extended
```

«No such file» — можно ставить:

```bash
mkdir -p ~/.hermes/desktop-plugins/abraxus-extended
```

```bash
cp ~/Documents/abrasite/hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js
```

Через несколько секунд в Hermes: Settings → Appearance → **ABRAXUS** (или `/skin abraxus-extended` в поле ввода). Если пункта нет — ⌘K → Reload desktop plugins.

## 2. Что проверить

- Новый сеанс: вместо HERMES AGENT — медный знак, по контуру бежит светлый штрих.
- Строка статуса слева: маленький знак; пока агент отвечает — точка вращается.
- Поля и чекбоксы в настройках видны (обводка 3:1).
- Системные настройки → Универсальный доступ → Дисплей → «Уменьшить движение»: всё статично.

## 3. Обновить

После правки `hermes-theme/tokens.json`:

```bash
node ~/Documents/abrasite/hermes-theme/extended/build.mjs
```

```bash
node ~/Documents/abrasite/hermes-theme/extended/check.mjs
```

```bash
cp ~/Documents/abrasite/hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js
```

После каждого `hermes update` — снова `check.mjs`: пункт 6 скажет, если Hermes переименовал то, на что опирается плагин.

## 4. Удалить

Сначала выбрать другую тему (например, Abraxus из STANDARD), иначе Desktop откатится на Nous. Затем:

```bash
rm -r ~/.hermes/desktop-plugins/abraxus-extended
```

## Если что-то пошло не так

| Что видно | Причина | Что делать |
|---|---|---|
| Уведомление об ошибке плагина | ошибка в `plugin.js` | `check.mjs`, прислать текст уведомления |
| На заставке снова HERMES AGENT | Hermes поменял вёрстку заставки | `check.mjs` п. 6; тема работает |
| Системный шрифт вместо Inter | нет интернета | ничего, вернётся с сетью |
| Знака в строке статуса нет | выбрана другая тема или знак скрыт меню строки статуса | выбрать ABRAXUS / включить в меню |
````

- [ ] **Step 2: Update hermes-theme/README.md**

В разделе «Два этапа» заменить абзац про EXTENDED на:

```markdown
**EXTENDED** (`extended/`, v1.0) — Desktop Theme Plugin `abraxus-extended` (`~/.hermes/desktop-plugins/`): точная тёмная палитра, Inter, медная заливка кнопок, поля 3:1, знак ABRA на заставке нового чата и в строке статуса. Подробности — спецификация `docs/superpowers/specs/2026-10-08-abraxus-extended-design.md`, установка — `extended/INSTALL.md`.
```

В разделе «Правило палитры» заменить строку про EXTENDED на:

```markdown
- `extended/plugin.js` — блок `ABX` пишет `node extended/build.mjs` из `tokens.json`; `extended/check.mjs` падает, если блок отстал.
```

- [ ] **Step 3: Update CLAUDE.md**

В блоке `hermes-theme/` раздела «Структура файлов» заменить строки
```
                        extended/ (Desktop-плагин) — ещё не начат. При правке
                        токенов сайта догонять tokens.json и скин
```
на
```
                        extended/ — Desktop-плагин abraxus-extended:
                        plugin.js (блок ABX пишет build.mjs из tokens.json,
                        руками не править) + check.mjs + тесты node --test.
                        При правке токенов сайта догонять tokens.json,
                        скин и node extended/build.mjs
```

- [ ] **Step 4: Verify**

Run: `node --test hermes-theme/extended/test/ && node hermes-theme/extended/check.mjs && ~/.hermes/hermes-agent/venv/bin/python hermes-theme/standard/check.py | tail -1`
Expected: тесты PASS, `OK: 0 ошибок`, `OK: 0 ошибок, 0 предупреждений`.

- [ ] **Step 5: Commit**

```bash
git add hermes-theme/extended/INSTALL.md hermes-theme/README.md
python3 - <<'EOF'
import subprocess
head = subprocess.run(['git', 'show', 'HEAD:CLAUDE.md'], capture_output=True, text=True, check=True).stdout
work = open('CLAUDE.md', encoding='utf-8').read()
start = work.index('hermes-theme/         —')
end = work.index('DESIGN_SYSTEM.md      —')
old_start = head.index('hermes-theme/         —')
old_end = head.index('DESIGN_SYSTEM.md      —')
new = head[:old_start] + work[start:end] + head[old_end:]
sha = subprocess.run(['git', 'hash-object', '-w', '--stdin'], input=new, capture_output=True, text=True, check=True).stdout.strip()
subprocess.run(['git', 'update-index', '--cacheinfo', '100644', sha, 'CLAUDE.md'], check=True)
EOF
git diff --cached --stat
git commit -m "Document ABRAXUS Extended install, update and removal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected в `git diff --cached --stat`: `CLAUDE.md` с изменением только в блоке `hermes-theme/`, `INSTALL.md`, `README.md`.

---

### Task 7: Установка и проверка в приложении — только по команде владельца

**Files:** нет изменений в репозитории (кроме возможных правок по итогам проверки — тогда отдельным коммитом с повторным прогоном Task 4, шаг 2).

- [ ] **Step 1: Получить явное «ставь» от владельца**

Спросить в чате: «Ставлю плагин в ~/.hermes/desktop-plugins/abraxus-extended?». Без ответа «да» не продолжать.

- [ ] **Step 2: Установить**

```bash
ls ~/.hermes/desktop-plugins/abraxus-extended 2>&1
mkdir -p ~/.hermes/desktop-plugins/abraxus-extended
cp hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js
diff -q hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js && echo same
```

Expected: первая команда — «No such file or directory»; последняя — `same`.

- [ ] **Step 3: Владелец включает тему**

Попросить: Settings → Appearance → **ABRAXUS** (или `/skin abraxus-extended`), прислать скриншот окна. Сверить с `preview.html`: фон `#0C0B09`, медь, Inter, знак в строке статуса.

- [ ] **Step 4: Проверка состояний по скриншотам**

Попросить владельца по очереди и сверить:
1. Новый сеанс → знак вместо HERMES AGENT, штрих бежит. Затем ещё один новый сеанс подряд — знак виден целиком (Review Focus, п. 1). Если отрисовка контура не повторяется, но знак и штрих есть — записать в INSTALL.md «отрисовка — только при первом показе за запуск» и принять; если знак не виден вовсе — стоп, разбирать.
2. Отправить сообщение → точка в строке статуса вращается, после ответа стоит.
3. Settings → любой экран с чекбоксами → обводка видна.
4. «Уменьшить движение» включить → заставка и точка статичны; выключить обратно.
5. Переключить тему на Abraxus (STANDARD) → знак в строке статуса исчез, на заставке HERMES AGENT; вернуть ABRAXUS.

- [ ] **Step 5: Итог**

Сообщить владельцу результат по каждому пункту шага 4. Push в GitHub не делать — это решение владельца.

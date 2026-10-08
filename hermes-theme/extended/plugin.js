// ABRAXUS EXTENDED — тема Hermes Desktop на дизайн-токенах a-bra.ru.
// Источник — hermes-theme/extended/plugin.js в репозитории сайта; ставится копией в
// ~/.hermes/desktop-plugins/abraxus-extended/plugin.js (см. INSTALL.md рядом).
// Цвета берутся только из блока ABX ниже — его пишет build.mjs из tokens.json.
import { host, STATUSBAR_AREAS, THEMES_AREA, TITLEBAR_AREAS, useI18n, useTheme, useValue } from '@hermes/plugin-sdk'
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

// Созвездие по мотиву src/hero.js: точки, связи с прозрачностью (1 − d / L) × 0,5,
// каждая шестая связь медная. Гуще, чем на сайте, и короче связи: каждая точка
// соединяется не более чем с тремя ближайшими соседями ближе 220 единиц.
// Холст 2400 × 1000 — на широком окне картинка почти не растягивается.
// Генератор с фиксированным зерном — картинка одна и та же при каждом запуске.
export function constellationSvg() {
  const W = 2400
  const H = 1000
  const LIMIT = 220
  let seed = 20260908
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
  const nodes = Array.from({ length: 170 }, () => ({ x: rand() * W, y: rand() * H, depth: rand() }))
  const pairs = new Map()
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j, d }) => j !== i && d < LIMIT)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ j, d }) => pairs.set(i < j ? `${i}-${j}` : `${j}-${i}`, d))
  })
  const paths = {}
  for (const [key, d] of pairs) {
    const [i, j] = key.split('-').map(Number)
    const alpha = Math.max(1, Math.round((1 - d / LIMIT) * 0.5 * 10)) / 10
    const color = (i + j) % 6 === 0 ? ABX.mark.stroke : ABX.colors.foreground
    const bucket = `${color}|${alpha}`
    paths[bucket] = (paths[bucket] ?? '') + `M${nodes[i].x | 0} ${nodes[i].y | 0}L${nodes[j].x | 0} ${nodes[j].y | 0}`
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

// Строка статуса (вариант A): точка-спутник над кольцом знака. Агент свободен —
// стоит; работает — обходит кольцо за 1,6 с. «Уменьшить движение» — не вращается,
// при работе становится медной.
export const STATUS_STYLE_ID = 'abraxus-extended-status'
const STATUS_VIEWBOX = '-18 -22 136 195'
const STATUS_CSS =
  '.abx-orbit{transform-box:view-box;transform-origin:50px 44.8px}' +
  '.abx-orbit--spin{animation:abx-orbit 1.6s linear infinite}' +
  '@keyframes abx-orbit{to{transform:rotate(360deg)}}'

// Счётчик пользователей на самом элементе: стиль снимается, только когда его
// отпустила последняя загруженная копия плагина.
function injectStatusStyle() {
  if (typeof document === 'undefined') return () => {}
  let el = document.getElementById(STATUS_STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STATUS_STYLE_ID
    el.textContent = STATUS_CSS
    el.abxUsers = 0
    document.head.appendChild(el)
  }
  el.abxUsers += 1
  return () => {
    el.abxUsers -= 1
    if (el.abxUsers === 0) el.remove()
  }
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

export default {
  id: THEME_NAME,
  name: 'ABRAXUS',
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: THEME })
    ctx.onDispose(injectStatusStyle())
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
  }
}

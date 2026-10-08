// ABRAXUS EXTENDED — тема Hermes Desktop на дизайн-токенах a-bra.ru.
// Источник — hermes-theme/extended/plugin.js в репозитории сайта; ставится копией в
// ~/.hermes/desktop-plugins/abraxus-extended/plugin.js (см. INSTALL.md рядом).
// Цвета берутся только из блока ABX ниже — его пишет build.mjs из tokens.json.
import { host, STATUSBAR_AREAS, THEMES_AREA, useTheme, useValue } from '@hermes/plugin-sdk'
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

export default {
  id: THEME_NAME,
  name: 'ABRAXUS',
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: THEME })
    ctx.onDispose(injectStatusStyle())
    ctx.register({ id: 'mark', area: STATUSBAR_AREAS.left, order: 0, render: () => jsx(StatusMark, {}) })
  }
}

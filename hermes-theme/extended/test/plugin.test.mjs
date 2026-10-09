import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { readBlock } from '../build.mjs'
import { PLUGIN_FILE, loadPlugin, sdkState } from '../load-plugin.mjs'

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

test('в CSS только согласованные селекторы', async () => {
  const { mod } = await loadPlugin()
  const selectors = [...mod.CUSTOM_CSS.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
  for (const selector of selectors) {
    assert.ok(
      selector === ':root' ||
        [
          mod.INTRO_SELECTOR,
          mod.LABEL_TEXT_SELECTOR,
          mod.LABEL_DOT_SELECTOR,
          mod.COMPOSER_SELECTOR,
          mod.BACKDROP_SELECTOR,
          mod.ASSISTANT_SELECTOR,
          mod.CARET_SELECTOR
        ].some(s =>
          selector.startsWith(s)
        ) ||
        selector === '@media (prefers-reduced-motion: reduce)' ||
        ['@keyframes abx-drift', 'from', 'to'].includes(selector),
      `лишний селектор: ${selector}`
    )
  }
  assert.ok(Buffer.byteLength(mod.CUSTOM_CSS) < 32768)
})

test('заставка: CORE из abra-motion — монета внутри орбиты, статичный кадр для «Уменьшить движение»', async () => {
  const { mod } = await loadPlugin()
  // Компактный data URI меняет двойные кавычки на одинарные — сравниваем так же.
  const quotes = svg => svg.replace(/"/g, "'")
  const [animated, still] = decodeUrls(mod.CUSTOM_CSS).filter(svg => svg.includes(mod.MARK_PATH)).map(quotes)
  assert.equal(animated, quotes(mod.splashSvg(true)))
  assert.match(animated, /<animate attributeName='d'[^>]*dur='2\.8s'[^>]*repeatCount='indefinite'/, 'монета')
  assert.match(animated, /<animateTransform attributeName='transform' type='rotate'/, 'маркер по орбите')
  assert.ok(!animated.includes('<script'), 'без скриптов')
  assert.equal(still, quotes(mod.motionSvg('core', 0)))
  assert.ok(!still.includes('<animate'), 'статичный кадр без анимации')
  assert.ok(still.includes(`stroke='${ABX.mark.stroke}'`))
  const media = mod.CUSTOM_CSS.slice(mod.CUSTOM_CSS.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.ok(decodeUrls(media).map(quotes).includes(still), 'статичный кадр — внутри медиазапроса')
  assert.match(mod.CUSTOM_CSS, new RegExp(`width: ${mod.SPLASH_SIZE}px !important;\\s+height: ${mod.SPLASH_SIZE}px;`))
})

// Тело правила по точному селектору (первое совпадение).
const ruleBody = (css, selector) => {
  const start = css.indexOf(`${selector} {`)
  return start < 0 ? null : css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
}

test('метки панелей: [ .МЕТКА ] вместо квадратика', async () => {
  const { mod } = await loadPlugin()
  assert.equal(mod.LABEL_TEXT_SELECTOR, '.dither + .truncate')
  assert.match(ruleBody(mod.CUSTOM_CSS, `${mod.LABEL_TEXT_SELECTOR}::before`), /content: "\[ \."/)
  assert.match(ruleBody(mod.CUSTOM_CSS, `${mod.LABEL_TEXT_SELECTOR}::after`), /content: " \]"/)
  assert.match(ruleBody(mod.CUSTOM_CSS, mod.LABEL_DOT_SELECTOR), /display: none !important/)
})

test('поле ввода: медные уголки в покое, рамка при фокусе, без анимации при «Уменьшить движение»', async () => {
  const { mod } = await loadPlugin()
  const css = mod.CUSTOM_CSS
  assert.equal(mod.COMPOSER_SELECTOR, '[data-slot="composer-surface"]')
  assert.match(ruleBody(css, mod.COMPOSER_SELECTOR), /border-color: transparent !important/)
  const corners = ruleBody(css, `${mod.COMPOSER_SELECTOR}::after`)
  assert.match(corners, /pointer-events: none/)
  assert.equal(corners.split(`linear-gradient(${ABX.mark.stroke}, ${ABX.mark.stroke})`).length - 1, 8, 'четыре уголка по две линии')
  assert.match(corners, /12px 1px/, 'горизонталь уголка 12 px')
  assert.match(corners, /1px 15px/, 'вертикаль уголка 15 px')
  assert.match(corners, /background-size: (12px 1px, 1px 15px(, )?){4};/, 'слои парами: горизонталь, вертикаль — по одному углу')
  assert.match(corners, /transition: background-size 320ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/)
  assert.match(ruleBody(css, `${mod.COMPOSER_SELECTOR}:focus-within::after`), /calc\(50% \+ 1px\) 1px/)
  const media = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(ruleBody(media, `  ${mod.COMPOSER_SELECTOR}::after`) ?? '', /transition: none/)
})

test('созвездие: как в hero сайта — 90 точек, связи короче 16 % диагонали, каждая шестая медная, детерминированно', async () => {
  const { mod } = await loadPlugin()
  const svg = mod.constellationSvg()
  assert.equal(svg, mod.constellationSvg(), 'одинаковое при каждом вызове')
  assert.match(svg, /viewBox="0 0 1600 1000"/)
  assert.equal((svg.match(/<circle /g) ?? []).length, 90)
  const segments = [...svg.matchAll(/M(\d+) (\d+)L(\d+) (\d+)/g)].map(m => Math.hypot(m[1] - m[3], m[2] - m[4]))
  assert.ok(segments.length > 400, `сплошная паутина, связей ${segments.length}`)
  assert.ok(Math.max(...segments) < Math.hypot(1600, 1000) * 0.16 + 2, 'связи не длиннее 16 % диагонали')
  assert.ok(svg.includes(`stroke="${ABX.mark.stroke}"`), 'медные связи')
  assert.ok(svg.includes(`stroke="${ABX.colors.foreground}"`), 'светлые связи')
  assert.ok(svg.includes(`fill="${ABX.colors.foreground}"`), 'точки')
})

test('фон за перепиской: статуя скрыта, созвездие дрейфует, при «Уменьшить движение» — стоит', async () => {
  const { mod } = await loadPlugin()
  const css = mod.CUSTOM_CSS
  assert.equal(mod.BACKDROP_SELECTOR, 'div:has(> img[src*="filler-bg0"])')
  assert.match(ruleBody(css, `${mod.BACKDROP_SELECTOR} > img`), /display: none !important/)
  assert.match(ruleBody(css, mod.BACKDROP_SELECTOR), /mix-blend-mode: normal !important/)
  assert.match(ruleBody(css, mod.BACKDROP_SELECTOR), /opacity: 0\.25 !important/)
  const layer = ruleBody(css, `${mod.BACKDROP_SELECTOR}::before`)
  assert.match(layer, /url\("data:image\/svg\+xml,/)
  assert.match(layer, /animation: abx-drift /)
  assert.match(css, /@keyframes abx-drift/)
  const media = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(ruleBody(media, `  ${mod.BACKDROP_SELECTOR}::before`) ?? '', /animation: none/)
  assert.ok(Buffer.byteLength(css) < 32768, `customCSS ${Buffer.byteLength(css)} байт`)
})

test('ответ агента — медная линия слева, курсор в поле ввода — медный', async () => {
  const { mod } = await loadPlugin()
  assert.equal(mod.ASSISTANT_SELECTOR, '[data-slot="aui_assistant-message-content"]')
  assert.match(ruleBody(mod.CUSTOM_CSS, mod.ASSISTANT_SELECTOR), new RegExp(`border-left: 1px solid ${ABX.mark.stroke}`))
  assert.equal(mod.CARET_SELECTOR, '[data-slot="composer-rich-input"]')
  assert.match(ruleBody(mod.CUSTOM_CSS, mod.CARET_SELECTOR), new RegExp(`caret-color: ${ABX.mark.stroke}`))
})

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
  const element = mark.data.render()
  return { mod, mark, state, tree: element.type(element.props) }
}

test('знак регистрируется в левой части строки статуса и скрывается её меню', async () => {
  const { mark } = await renderMark()
  assert.equal(mark.id, 'mark')
  assert.equal(mark.order, 0)
  assert.equal(mark.render, undefined, 'render в data: иначе Hermes не даёт пункт в меню видимости')
  assert.equal(mark.data.id, 'abraxus-extended:mark')
  assert.equal(mark.data.toggleLabel, 'ABRAXUS')
})

// Кадр в строке статуса: MotionFrame — функциональный компонент, его разметка —
// строка SVG в dangerouslySetInnerHTML.
const frameOf = tree => {
  const frame = find(tree, tree.props.children.type)
  return frame.type(frame.props)
}

test('знак строки статуса — ORBITAL из abra-motion, медный, без глобальных имён', async () => {
  const { mod } = await loadPlugin()
  const svg = mod.motionSvg('orbital', 0, mod.STATUS_SIZE)
  assert.match(svg, /^<svg [^>]*width="18" height="18"/)
  assert.match(svg, new RegExp(`stroke="${ABX.mark.stroke}"`))
  assert.match(svg, new RegExp(mod.MARK_PATH))
  assert.equal(mod.motionSvg('orbital', 1, 18), mod.motionSvg('orbital', 0, 18), 'цикл бесшовный')
  assert.equal(globalThis.AbraMotion, undefined)
  assert.equal(globalThis.AbraMotionTokens, undefined)
})

test('свободен: кадр t = 0, подпись «свободен», цикл не запущен', async () => {
  const { mod, tree, state } = await renderMark({ busy: false })
  assert.equal(tree.props['aria-label'], 'ABRAXUS — свободен')
  assert.equal(tree.props.title, 'ABRAXUS — свободен')
  assert.equal(tree.props.role, 'img')
  assert.equal(frameOf(tree).props.dangerouslySetInnerHTML.__html, mod.motionSvg('orbital', 0, 18))
  let frames = 0
  globalThis.requestAnimationFrame = () => ++frames
  try {
    state.effects.forEach(fn => fn())
    assert.equal(frames, 0)
  } finally {
    delete globalThis.requestAnimationFrame
  }
})

test('работает: маркер идёт по кольцу с частотой 30 кадров в секунду', async () => {
  const { tree, state } = await renderMark({ busy: true })
  assert.equal(tree.props['aria-label'], 'ABRAXUS — работает')
  const queued = []
  let cancelled = null
  let ids = 0
  globalThis.requestAnimationFrame = fn => (queued.push(fn), ++ids)
  globalThis.cancelAnimationFrame = id => { cancelled = id }
  try {
    const cleanups = state.effects.map(fn => fn())
    assert.equal(queued.length, 1, 'цикл запущен')
    const start = performance.now()
    queued.shift()(start + 1400)
    assert.ok(Math.abs(state.lastSet - 0.5) < 0.01, 'полцикла за 1,4 с')
    queued.shift()(start + 1410)
    assert.ok(Math.abs(state.lastSet - 0.5) < 0.01, 'кадр чаще 1/30 с пропущен')
    cleanups.forEach(fn => fn?.())
    assert.equal(cancelled, ids, 'отменён последний запрошенный кадр')
    assert.equal(state.lastSet, 0, 'остановка — снова кадр t = 0')
  } finally {
    delete globalThis.requestAnimationFrame
    delete globalThis.cancelAnimationFrame
  }
})

test('другая тема — знака нет, даже если агент работает', async () => {
  const { tree } = await renderMark({ busy: true, themeName: 'nous' })
  assert.equal(tree, null)
})

test('«Уменьшить движение»: цикл не запускается, при работе маркер на 3 часах, подписка на change', async () => {
  const listeners = []
  globalThis.matchMedia = query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: () => {}
  })
  let frames = 0
  globalThis.requestAnimationFrame = () => ++frames
  try {
    const { mod, tree, state } = await renderMark({ busy: true })
    assert.equal(
      frameOf(tree).props.dangerouslySetInnerHTML.__html,
      mod.motionSvg('orbital', mod.STATUS_REDUCED_BUSY_T, 18)
    )
    state.effects.forEach(fn => fn())
    assert.equal(frames, 0, 'без анимации')
    assert.equal(listeners[0][0], 'change', 'реагирует на переключение без перезапуска')
    listeners[0][1]({ matches: false })
    assert.equal(state.lastSet, false)
  } finally {
    delete globalThis.matchMedia
    delete globalThis.requestAnimationFrame
  }
})

test('страница ABRAXUS: в шапке монета AXIAL · Y из abra-motion', async () => {
  const { mod } = await loadPlugin()
  const page = mod.PageMark()
  const html = page.type(page.props).props.dangerouslySetInnerHTML.__html
  assert.equal(html, mod.motionSvg('axialY', 0, mod.PAGE_MARK_SIZE))
})

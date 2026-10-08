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

test('заставка: анимированный знак и статичный для «Уменьшить движение»', async () => {
  const { mod } = await loadPlugin()
  const [animated, still] = decodeUrls(mod.CUSTOM_CSS).filter(svg => svg.includes(mod.MARK_PATH))
  assert.ok(animated.includes(`d="${mod.MARK_PATH}"`))
  assert.ok(animated.includes('@keyframes'), 'есть анимация')
  assert.ok(animated.includes(`stroke="${ABX.mark.signal}"`), 'светлый штрих')
  assert.ok(still.includes(`stroke="${ABX.mark.stroke}"`))
  assert.ok(!still.includes('@keyframes'), 'статичный знак без анимации')
  const media = mod.CUSTOM_CSS.slice(mod.CUSTOM_CSS.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.ok(decodeUrls(media).includes(still), 'статичный знак — внутри медиазапроса')
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

test('созвездие: как в hero сайта — 90 точек, связи, каждая шестая медная, детерминированно', async () => {
  const { mod } = await loadPlugin()
  const svg = mod.constellationSvg()
  assert.equal(svg, mod.constellationSvg(), 'одинаковое при каждом вызове')
  assert.equal((svg.match(/<circle /g) ?? []).length, 90)
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

const fakeDocument = () => {
  const nodes = {}
  globalThis.document = {
    getElementById: id => nodes[id] ?? null,
    createElement: () => {
      const el = { remove: () => delete nodes[el.id] }
      return el
    },
    head: { appendChild: el => (nodes[el.id] = el) }
  }
  return nodes
}

test('<style> строки статуса: перезагрузка как в Hermes — выгрузка, затем загрузка, стиль один', async () => {
  const nodes = fakeDocument()
  try {
    const first = await loadPlugin()
    assert.match(nodes['abraxus-extended-status'].textContent, /@keyframes abx-orbit/)
    assert.match(nodes['abraxus-extended-status'].textContent, /transform-origin:50px 44\.8px/)
    first.disposers.forEach(fn => fn())
    assert.equal(nodes['abraxus-extended-status'], undefined, 'снят при выключении')
    const second = await loadPlugin()
    assert.ok(nodes['abraxus-extended-status'], 'снова внедрён после загрузки')
    assert.equal(Object.keys(nodes).length, 1, 'без дублей')
    second.disposers.forEach(fn => fn())
  } finally {
    delete globalThis.document
  }
})

test('<style> строки статуса не снимается, пока им пользуется живая копия плагина', async () => {
  const nodes = fakeDocument()
  try {
    const first = await loadPlugin()
    const second = await loadPlugin()
    first.disposers.forEach(fn => fn())
    assert.ok(nodes['abraxus-extended-status'], 'вторая копия ещё жива — стиль на месте')
    second.disposers.forEach(fn => fn())
    assert.equal(nodes['abraxus-extended-status'], undefined, 'последняя копия выключена — стиль снят')
  } finally {
    delete globalThis.document
  }
})

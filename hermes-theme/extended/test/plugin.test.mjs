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

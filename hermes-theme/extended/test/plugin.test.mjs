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

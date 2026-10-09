#!/usr/bin/env node
// Проверки ABRAXUS EXTENDED. Запускать после правки токенов и после каждого
// `hermes update`:  node ~/Documents/abrasite/hermes-theme/extended/check.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CONTENT_FILE,
  MOTION_FILES,
  TOKENS_FILE,
  buildAbx,
  buildContent,
  buildMotion,
  writeBlock,
  writeContentBlock,
  writeMotionBlock
} from './build.mjs'
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
const tokensJson = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'))
const abx = buildAbx(tokensJson)
check(writeBlock(source, abx) === source, 'блок ABX в plugin.js совпадает со сборкой из tokens.json')
const content = buildContent(JSON.parse(readFileSync(CONTENT_FILE, 'utf8')))
check(writeContentBlock(source, content) === source, 'блок CONTENT в plugin.js совпадает с content.json')
const motion = buildMotion(MOTION_FILES.map(file => readFileSync(file, 'utf8')), tokensJson)
check(writeMotionBlock(source, motion) === source, 'блок MOTION в plugin.js совпадает с abra-motion/src (цвет знака = accent)')

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
  s =>
    s !== ':root' &&
    ![
      mod.INTRO_SELECTOR,
      mod.LABEL_TEXT_SELECTOR,
      mod.LABEL_DOT_SELECTOR,
      mod.COMPOSER_SELECTOR,
      mod.BACKDROP_SELECTOR,
      mod.ASSISTANT_SELECTOR,
      mod.CARET_SELECTOR
    ].some(a => s.startsWith(a)) &&
    s !== '@media (prefers-reduced-motion: reduce)' &&
    !['@keyframes abx-drift', 'from', 'to'].includes(s)
)
check(extra.length === 0, `только согласованные селекторы${extra.length ? ': лишние ' + extra.join(' | ') : ''}`)
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
  ['host.state.busy', /^\s+busy: readonlyAtom<boolean>/m],
  ['TITLEBAR_AREAS', /export \{[^}]*TITLEBAR_AREAS[^}]*\} from '\.\/areas'/],
  ['PALETTE_AREA', /export \{ PALETTE_AREA\b/],
  ['ROUTES_AREA', /^\s+ROUTES_AREA,$/m],
  ['SIDEBAR_NAV_AREA', /^\s+SIDEBAR_NAV_AREA,$/m],
  ['SESSION_ROW_AREAS', /export \{ SESSION_ROW_AREAS\b/],
  ['useI18n', /^\s+useI18n,$/m],
  ['atom', /export \{ atom\b[^}]*\} from 'nanostores'/],
  ['host.state.focusedStoredSessionId', /^\s+focusedStoredSessionId: readonlyAtom<null \| string>/m],
  ['host.navigate', /^\s+navigate: \(path: string\)/m],
  ['host.request', /^\s+request: async <T>\(method: string/m],
  ['host.composer', /^\s+composer: composerHost,$/m],
  ['host.i18n', /^\s+i18n: i18nHost$/m]
]) {
  check(pattern.test(sdk), `SDK экспортирует ${what}`)
}
const composer = readFileSync(join(DESKTOP, 'src', 'sdk', 'composer.ts'), 'utf8')
check(/insertText: \(sessionId: null \| string, text: string/.test(composer), 'host.composer.insertText(null, text) — вставка в активное поле')
const context = readFileSync(join(DESKTOP, 'src', 'contrib', 'plugin.ts'), 'utf8')
check(/^\s+storage: PluginStorage$/m.test(context), 'контекст плагина даёт ctx.storage (ручные метки)')
check(/^\s+onEvent: \(type: string/m.test(context), 'контекст плагина даёт ctx.onEvent')
const events = readFileSync(join(HERMES, 'tui_gateway', 'contracts', 'events.py'), 'utf8')
check(events.includes('event("sessions.changed"'), 'шлюз шлёт sessions.changed (перечитать названия для меток)')
if (!existsSync(DIST)) {
  check(false, `нет собранного Desktop в ${DIST}`)
} else {
  const bundle = readdirSync(DIST)
    .filter(f => f.endsWith('.js'))
    .map(f => readFileSync(join(DIST, f), 'utf8'))
    .join('\n')
  check(bundle.includes('aui_intro'), 'в сборке Desktop есть заставка data-slot="aui_intro"')
  check(bundle.includes('wordmark fit-text'), 'в сборке Desktop есть класс надписи wordmark')
  check(bundle.includes('dither inline-block size-2 shrink-0'), 'в сборке Desktop есть квадратик меток панелей (dither)')
  check(bundle.includes('min-w-0 truncate leading-none'), 'в сборке Desktop есть текст меток панелей (truncate)')
  check(bundle.includes('composer-surface'), 'в сборке Desktop есть поле ввода data-slot="composer-surface"')
  check(bundle.includes('filler-bg0'), 'в сборке Desktop есть фон-статуя (filler-bg0) для созвездия')
  check(bundle.includes('aui_assistant-message-content'), 'в сборке Desktop есть ответ агента aui_assistant-message-content')
  check(bundle.includes('composer-rich-input'), 'в сборке Desktop есть поле набора composer-rich-input')
}

const SERVICE_PATH = mod.SERVICE_KEY

section('7. Имя ABRAXUS в текстах (настоящий русский каталог Hermes)')
// Каталог собирается из исходников установленного Hermes его же esbuild.
const tmp = mkdtempSync(join(tmpdir(), 'abraxus-catalog-'))
const esbuild = join(HERMES, 'node_modules', '.bin', 'esbuild')
const bundled = spawnSync(esbuild, [
  join(DESKTOP, 'src', 'i18n', 'ru.ts'), '--bundle', '--platform=node', '--format=esm', '--log-level=error',
  `--tsconfig=${join(DESKTOP, 'tsconfig.json')}`, `--outfile=${join(tmp, 'ru.mjs')}`
])
if (bundled.status !== 0) {
  check(false, `не удалось собрать ru.ts: ${String(bundled.stderr).slice(0, 200)}`)
} else {
  const { ru } = await import(pathToFileURL(join(tmp, 'ru.mjs')).href)
  const out = mod.brandTexts(ru)
  const renamed = []
  const kept = []
  const walk = (node, over, path) => {
    if (typeof node === 'string' || Array.isArray(node)) {
      const text = [].concat(node).join(' | ')
      if (!/\bHermes\b/.test(text)) return
      if (over === undefined) kept.push(`${path}: ${text}`)
      else renamed.push(`${path}: ${[].concat(over).join(' | ')}`)
    } else if (typeof node === 'function') {
      let sample
      try { sample = [].concat(node('X', 'X', 'X', 'X')).join(' | ') } catch { return }
      if (!/\bHermes\b/.test(sample)) return
      if (over === undefined) kept.push(`${path}(): ${sample}`)
      else renamed.push(`${path}(): ${[].concat(over('X', 'X', 'X', 'X')).join(' | ')}`)
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) walk(value, over?.[key], path ? `${path}.${key}` : key)
    }
  }
  walk(ru, out, '')
  check(renamed.length > 50, `переименовано ${renamed.length} текстов, оставлено служебных с Hermes: ${kept.length}`)
  const text = line => line.slice(line.indexOf(': ') + 2)
  check(renamed.every(line => !mod.hasName(text(line))), 'в переименованных не осталось Hermes (кроме названий продуктов Nous)')
  check(
    kept.every(line => SERVICE_PATH.test(line.split(':')[0]) || !mod.hasName(text(line))),
    'Hermes остался только в служебных ключах и названиях продуктов Nous'
  )
  if (process.argv.includes('--names')) {
    console.log('\n  Переименовано:\n' + renamed.map(l => `    ${l}`).join('\n'))
    console.log('\n  Оставлено (служебное):\n' + kept.map(l => `    ${l}`).join('\n'))
  } else {
    console.log('       полный список: node hermes-theme/extended/check.mjs --names')
  }
}
rmSync(tmp, { recursive: true, force: true })

console.log(`\n${failures ? 'ПРОВАЛ' : 'OK'}: ${failures} ошибок`)
process.exitCode = failures ? 1 : 0

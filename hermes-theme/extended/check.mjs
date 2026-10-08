#!/usr/bin/env node
// Проверки ABRAXUS EXTENDED. Запускать после правки токенов и после каждого
// `hermes update`:  node ~/Documents/abrasite/hermes-theme/extended/check.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { TOKENS_FILE, buildAbx, writeBlock } from './build.mjs'
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
  s =>
    s !== ':root' &&
    ![mod.INTRO_SELECTOR, mod.LABEL_TEXT_SELECTOR, mod.LABEL_DOT_SELECTOR, mod.COMPOSER_SELECTOR].some(a => s.startsWith(a)) &&
    s !== '@media (prefers-reduced-motion: reduce)'
)
check(
  extra.length === 0,
  `селекторы только :root, заставка, метки панелей и поле ввода${extra.length ? ': лишние ' + extra.join(' | ') : ''}`
)
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
  check(bundle.includes('dither inline-block size-2 shrink-0'), 'в сборке Desktop есть квадратик меток панелей (dither)')
  check(bundle.includes('min-w-0 truncate leading-none'), 'в сборке Desktop есть текст меток панелей (truncate)')
  check(bundle.includes('composer-surface'), 'в сборке Desktop есть поле ввода data-slot="composer-surface"')
}

console.log(`\n${failures ? 'ПРОВАЛ' : 'OK'}: ${failures} ошибок`)
process.exitCode = failures ? 1 : 0

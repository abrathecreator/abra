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

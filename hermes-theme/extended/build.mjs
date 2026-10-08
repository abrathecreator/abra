#!/usr/bin/env node
// Вписывает в plugin.js два блока: цвета из hermes-theme/tokens.json (// <tokens>)
// и тексты/правила из content.json (// <content>).
//   node hermes-theme/extended/build.mjs          — переписать блоки
//   node hermes-theme/extended/build.mjs --check  — код 1, если блоки отстали
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const TOKENS_FILE = join(HERE, '..', 'tokens.json')
export const PLUGIN_FILE = join(HERE, 'plugin.js')
export const CONTENT_FILE = join(HERE, 'content.json')
export const BEGIN = '// <tokens>'
export const END = '// </tokens>'
const CONTENT_BEGIN = '// <content>'
const CONTENT_END = '// </content>'

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

function blockRange(source, begin, end) {
  const start = source.indexOf(begin)
  const stop = source.indexOf(end)
  if (start < 0 || stop < start) throw new Error(`В plugin.js нет блока ${begin} … ${end}`)
  return [start, stop + end.length]
}

function readMarked(source, begin, end) {
  const [start, stop] = blockRange(source, begin, end)
  const body = source.slice(start, stop)
  return JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1))
}

function writeMarked(source, begin, end, name, from, value) {
  const [start, stop] = blockRange(source, begin, end)
  const block = `${begin}\n// Пишет build.mjs из ${from} — руками не править.\nconst ${name} = ${JSON.stringify(value, null, 2)}\n${end}`
  return source.slice(0, start) + block + source.slice(stop)
}

export const readBlock = source => readMarked(source, BEGIN, END)
export const writeBlock = (source, abx) => writeMarked(source, BEGIN, END, 'ABX', 'hermes-theme/tokens.json', abx)
export const readContentBlock = source => readMarked(source, CONTENT_BEGIN, CONTENT_END)
export const writeContentBlock = (source, content) =>
  writeMarked(source, CONTENT_BEGIN, CONTENT_END, 'CONTENT', 'hermes-theme/extended/content.json', content)

// content.json → блок CONTENT: проверяет форму, чтобы опечатка в правке текста
// падала здесь, а не молча в приложении.
export function buildContent(json) {
  const { $comment, ...content } = json
  for (const label of content.labels ?? []) {
    if (!['accent', 'muted'].includes(label.color)) {
      throw new Error(`метка «${label.id}»: color должен быть accent или muted`)
    }
    if (!['dot', 'ring'].includes(label.glyph)) throw new Error(`метка «${label.id}»: glyph должен быть dot или ring`)
    if (!label.name || !Array.isArray(label.words) || !label.words.length) {
      throw new Error(`метка «${label.id}»: нужны name и непустой words`)
    }
  }
  for (const template of content.templates ?? []) {
    if (!template.title || !template.text) throw new Error(`шаблон «${template.id}»: нужны title и text`)
  }
  if (!content.motto || !content.labels?.length || !content.templates?.length || !content.method?.length) {
    throw new Error('content.json: нужны motto, labels, templates и method')
  }
  return content
}

function main(argv) {
  const abx = buildAbx(JSON.parse(readFileSync(TOKENS_FILE, 'utf8')))
  const content = buildContent(JSON.parse(readFileSync(CONTENT_FILE, 'utf8')))
  const source = readFileSync(PLUGIN_FILE, 'utf8')
  const next = writeContentBlock(writeBlock(source, abx), content)
  if (argv.includes('--check')) {
    if (next !== source) {
      console.error('FAIL plugin.js отстал от tokens.json или content.json — запустите: node hermes-theme/extended/build.mjs')
      return 1
    }
    console.log('ok   блоки токенов и содержимого в plugin.js совпадают с tokens.json и content.json')
    return 0
  }
  if (next !== source) writeFileSync(PLUGIN_FILE, next)
  console.log(next === source ? 'plugin.js уже актуален' : 'plugin.js обновлён из tokens.json и content.json')
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2))

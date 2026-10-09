#!/usr/bin/env node
// Вписывает в plugin.js три блока: цвета из hermes-theme/tokens.json (// <tokens>),
// тексты/правила из content.json (// <content>) и анимации знака из abra-motion
// (// <motion>) — тот же код, что рисует эмодзи для Telegram.
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
export const MOTION_FILES = ['tokens.js', 'motion.js'].map(name => join(HERE, '..', '..', 'abra-motion', 'src', name))
const MOTION_BEGIN = '// <motion>'
const MOTION_END = '// </motion>'
const MOTION_SCOPE = '(typeof window !== "undefined" ? window : globalThis)'
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

// abra-motion/src/*.js — обычные скрипты, которые кладут API в window. В плагине
// они получают свой объект вместо window: глобальных имён плагин не заводит.
// Цвет знака в анимациях обязан совпадать с акцентом темы.
export function buildMotion(sources, json) {
  const accent = /accent:\s*"(#[0-9A-Fa-f]{6})"/.exec(sources[0])?.[1]?.toUpperCase()
  const expected = flattenTokens(json).accent
  if (accent !== expected) throw new Error(`abra-motion: accent ${accent} не совпадает с tokens.json ${expected}`)
  const bodies = sources.map((source, i) => {
    if (source.split(MOTION_SCOPE).length !== 2) throw new Error(`abra-motion: в ${MOTION_FILES[i]} изменилась обёртка`)
    return source.trim().replace(MOTION_SCOPE, '(scope)')
  })
  return `const MOTION = (() => {\n  const scope = {}\n${bodies.map(body => `;${body}`).join('\n')}\n  return scope.AbraMotion\n})()`
}

export const writeMotionBlock = (source, code) => {
  const [start, stop] = blockRange(source, MOTION_BEGIN, MOTION_END)
  const block = `${MOTION_BEGIN}\n// Пишет build.mjs из abra-motion/src/tokens.js и motion.js — руками не править.\n${code}\n${MOTION_END}`
  return source.slice(0, start) + block + source.slice(stop)
}

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
  const json = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'))
  const abx = buildAbx(json)
  const content = buildContent(JSON.parse(readFileSync(CONTENT_FILE, 'utf8')))
  const motion = buildMotion(MOTION_FILES.map(file => readFileSync(file, 'utf8')), json)
  const source = readFileSync(PLUGIN_FILE, 'utf8')
  const next = writeMotionBlock(writeContentBlock(writeBlock(source, abx), content), motion)
  if (argv.includes('--check')) {
    if (next !== source) {
      console.error('FAIL plugin.js отстал от tokens.json, content.json или abra-motion — запустите: node hermes-theme/extended/build.mjs')
      return 1
    }
    console.log('ok   блоки токенов, содержимого и анимаций в plugin.js совпадают с источниками')
    return 0
  }
  if (next !== source) writeFileSync(PLUGIN_FILE, next)
  console.log(next === source ? 'plugin.js уже актуален' : 'plugin.js обновлён из tokens.json, content.json и abra-motion')
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2))

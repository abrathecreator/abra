import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { BEGIN, END, ROLES, TOKENS_FILE, buildAbx, flattenTokens, readBlock, writeBlock } from '../build.mjs'

const tokensJson = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'))

test('flattenTokens сводит base и derived в имя → hex', () => {
  const flat = flattenTokens(tokensJson)
  assert.equal(flat.bg, '#0C0B09')
  assert.equal(flat['line-control'], '#63615D')
  assert.equal(flat['bad-text'], '#C07460')
})

test('buildAbx раскладывает токены по ролям Hermes', () => {
  const abx = buildAbx(tokensJson)
  assert.equal(abx.colors.background, '#0C0B09')
  assert.equal(abx.colors.input, '#63615D')
  assert.equal(abx.colors.primary, '#B87333')
  assert.equal(abx.colors.primaryForeground, '#0C0B09')
  assert.equal(abx.terminal.blue, '#6E86A0')
  assert.equal(abx.terminal.brightWhite, '#EDEBE6')
  assert.deepEqual(abx.mark, { stroke: '#B87333', signal: '#EDEBE6' })
  assert.deepEqual(abx.solid, { fill: '#B87333', ink: '#0C0B09' })
  for (const [group, roles] of Object.entries(ROLES)) {
    assert.deepEqual(Object.keys(abx[group]).sort(), Object.keys(roles).sort(), group)
  }
})

test('buildAbx падает понятной ошибкой, если токена нет', () => {
  const broken = structuredClone(tokensJson)
  delete broken.derived['line-control']
  assert.throws(() => buildAbx(broken), /Нет токена «line-control» для colors\.input/)
})

test('writeBlock заменяет только блок, readBlock читает его обратно', () => {
  const source = `head\n${BEGIN}\nconst ABX = {}\n${END}\ntail\n`
  const abx = buildAbx(tokensJson)
  const next = writeBlock(source, abx)
  assert.ok(next.startsWith('head\n'))
  assert.ok(next.endsWith('\ntail\n'))
  assert.deepEqual(readBlock(next), abx)
  assert.equal(writeBlock(next, abx), next, 'повторная запись ничего не меняет')
})

test('writeBlock без маркеров — ошибка', () => {
  assert.throws(() => writeBlock('no markers', {}), /нет блока \/\/ <tokens>/)
})

import { CONTENT_FILE, buildContent, readContentBlock, writeContentBlock } from '../build.mjs'

const contentJson = JSON.parse(readFileSync(CONTENT_FILE, 'utf8'))

test('buildContent: метки, шаблоны, метод и девиз из content.json, без служебного $comment', () => {
  const content = buildContent(contentJson)
  assert.equal(content.$comment, undefined)
  assert.equal(content.motto, 'Магии не будет. Система будет.')
  assert.deepEqual(content.labels.map(l => l.id), ['tech', 'abra', 'client'])
  assert.equal(content.templates.length, 5)
  assert.equal(content.method.length, 5)
})

test('buildContent падает понятной ошибкой на неверной метке или шаблоне', () => {
  const badColor = structuredClone(contentJson)
  badColor.labels[0].color = 'red'
  assert.throws(() => buildContent(badColor), /метка «tech»: color должен быть accent или muted/)
  const noText = structuredClone(contentJson)
  delete noText.templates[1].text
  assert.throws(() => buildContent(noText), /шаблон «direct»: нужны title и text/)
})

test('блок CONTENT пишется и читается так же, как блок токенов', () => {
  const source = 'a\n// <content>\nconst CONTENT = {}\n// </content>\nb\n'
  const content = buildContent(contentJson)
  const next = writeContentBlock(source, content)
  assert.deepEqual(readContentBlock(next), content)
  assert.equal(writeContentBlock(next, content), next)
})

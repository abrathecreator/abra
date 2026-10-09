import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { readBlock } from '../build.mjs'
import { PLUGIN_FILE, loadPlugin, sdkState } from '../load-plugin.mjs'

const ABX = readBlock(readFileSync(PLUGIN_FILE, 'utf8'))
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

// Разворачивает дерево jsx-заглушек: все узлы, удовлетворяющие условию.
const findAll = (node, match, out = []) => {
  if (!node || typeof node !== 'object') return out
  if (typeof node.type === 'function') return findAll(node.type(node.props), match, out)
  if (match(node)) out.push(node)
  for (const child of [].concat(node.props?.children ?? [])) findAll(child, match, out)
  return out
}
const textOf = node =>
  typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : [].concat(node.props?.children ?? []).map(textOf).join('')

test('classify: реальные названия сеансов владельца — по порядку Техническое → ABRA → Клиент', async () => {
  const { mod } = await loadPlugin()
  const cases = {
    'Подготовить read-only отчёт по Директу за сентябрь': 'client',
    'Проект gbi_spb: проанализируй кампанию…': 'client',
    'Найти кампании с ростом CPC в сентябре 2026': 'client',
    'Настроить воронку по каналам и статусам': 'client',
    '[ Анализ сделок ]': 'client',
    'Плагин Директ': 'tech',
    'Объяснить работу плагина и интеграции с amoCRM': 'tech',
    'Run hermes doctor --fix': 'tech',
    'как мне постреть список всех доступных тем? Как…': null,
    'Какую систему разбираем?': null,
    'Обновить кейс ЖБИ на сайте': 'abra',
    'Сделать отчет без буквы ё': 'client',
    'Отладка подсистемы': null
  }
  for (const [title, expected] of Object.entries(cases)) assert.equal(mod.classify(title), expected, title)
})

test('значок сеанса: медная точка — клиент, медное кольцо — ABRA, серая точка — техническое', async () => {
  const { mod, contributions } = await loadPlugin({
    sessionList: {
      sessions: [
        { id: 'live-1', _lineage_root_id: 'root-1', title: 'Отчёт по Директу' },
        { id: 's-2', title: 'Обновить кейс ЖБИ на сайте' },
        { id: 's-3', title: 'Плагин Директ' },
        { id: 's-4', title: 'Что-то без метки' }
      ]
    }
  })
  await settle()
  const slot = contributions.find(c => c.area === 'sessionRow.leading')
  assert.ok(slot, 'слот перед названием')
  const markOf = sessionId => {
    const element = slot.data.render({ sessionId })
    return element && element.type(element.props)
  }
  const client = markOf('root-1')
  assert.equal(client.props['aria-label'], 'Клиент', 'по durable id (lineage root), а не live id')
  assert.equal(client.props.style.background, ABX.mark.stroke)
  const abra = markOf('s-2')
  assert.equal(abra.props['aria-label'], 'ABRA')
  assert.match(abra.props.style.border, new RegExp(ABX.mark.stroke))
  assert.equal(markOf('s-3').props.style.background, ABX.colors.mutedForeground)
  assert.equal(markOf('s-4'), null)
  globalThis.__abxSdk.themeName = 'nous'
  assert.equal(markOf('root-1'), null, 'другая тема — без меток')
})

test('список сеансов перечитывается при sessions.changed', async () => {
  const { events } = await loadPlugin()
  const state = globalThis.__abxSdk
  assert.equal(state.requests[0][0], 'session.list')
  assert.ok(events['sessions.changed']?.length, 'подписка на изменения')
  events['sessions.changed'][0]()
  assert.equal(state.requests.length, 2)
})

test('⌘K: ручная метка для открытого сеанса важнее автоматической и сохраняется', async () => {
  const { mod, contributions, stored } = await loadPlugin()
  const state = globalThis.__abxSdk
  state.sessionList = { sessions: [{ id: 's-9', title: 'Плагин Директ' }] }
  state.focused = 's-9'
  const palette = contributions.filter(c => c.area === 'palette').map(c => c.data)
  const labels = palette.filter(p => p.label.startsWith('Метка сеанса: '))
  assert.deepEqual(
    labels.map(p => p.label),
    ['Метка сеанса: Техническое', 'Метка сеанса: ABRA', 'Метка сеанса: Клиент', 'Метка сеанса: Без метки', 'Метка сеанса: Автоматически']
  )
  labels.find(p => p.label === 'Метка сеанса: Клиент').run()
  assert.equal(mod.SessionLabel({ sessionId: 's-9' }).props['aria-label'], 'Клиент')
  assert.deepEqual(stored['labels.manual'], { 's-9': 'client' })
  labels.find(p => p.label === 'Метка сеанса: Без метки').run()
  assert.equal(mod.SessionLabel({ sessionId: 's-9' }), null)
  labels.find(p => p.label === 'Метка сеанса: Автоматически').run()
  assert.deepEqual(stored['labels.manual'], {})
})

test('⌘K: шаблоны задач вставляют текст в поле ввода, не отправляя', async () => {
  const { contributions } = await loadPlugin()
  const state = globalThis.__abxSdk
  const templates = contributions.filter(c => c.area === 'palette' && c.data.label.startsWith('Задача: ')).map(c => c.data)
  assert.equal(templates.length, 5)
  templates.find(p => p.label === 'Задача: Отчёт по Директу').run()
  await settle()
  assert.equal(state.inserts.length, 1)
  assert.match(state.inserts[0][1], /^Read-only отчёт по кампаниям Яндекс Директа/)
  assert.equal(state.navigations.length, 0, 'поле ввода было на экране — без перехода')
})

test('если поля ввода на экране нет — переход в новый чат и повторная вставка', async () => {
  const { mod } = await loadPlugin()
  const state = globalThis.__abxSdk
  state.insertResults = [false, true]
  const ok = await mod.insertTemplate('Текст {период}')
  assert.equal(ok, true)
  assert.deepEqual(state.navigations, ['/'])
  assert.equal(state.inserts.length, 2)
})

test('страница ABRAXUS: пункт в боковой панели, девиз, карточки задач, метод', async () => {
  const { contributions } = await loadPlugin()
  const route = contributions.find(c => c.area === 'routes')
  const nav = contributions.find(c => c.area === 'sidebar.nav')
  assert.equal(route.data.path, '/abraxus')
  assert.deepEqual({ path: nav.data.path, label: nav.data.label }, { path: '/abraxus', label: 'ABRAXUS' })
  assert.ok(nav.data.codicon)
  const page = route.render()
  const all = findAll(page, () => true)
  const text = all.map(textOf).join(' ')
  assert.match(text, /Магии не будет\. Система будет\./)
  const cards = findAll(page, n => n.type === 'button')
  assert.equal(cards.length, 5)
  assert.match(textOf(cards[0]), /Диагностика воронки/)
  for (const step of ['Увидеть', 'Понять', 'Спроектировать', 'Построить', 'Усилить']) assert.match(text, new RegExp(step))
  const state = globalThis.__abxSdk
  cards[1].props.onClick()
  await settle()
  assert.match(state.inserts.at(-1)[1], /Яндекс Директа/)
})

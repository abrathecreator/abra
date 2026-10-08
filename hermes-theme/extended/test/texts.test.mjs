import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadPlugin, sdkState } from '../load-plugin.mjs'

// Кусочек каталога Hermes в той же форме, что настоящий (строки, списки, функции).
const catalog = () => ({
  composer: {
    newSessionPlaceholders: ['Дайте Hermes задачу'],
    followUpPlaceholders: ['Добавьте контекст'],
    placeholderStarting: 'Запуск Hermes...'
  },
  intro: { stock: { none: ['Hermes готов.'] }, custom: personality => [`Hermes в роли ${personality}`] },
  sessionImport: { continue: 'Продолжить в Hermes', subtitle: 'Без имени' },
  notifications: { updateHermes: 'Обновить Hermes', native: { turnDoneTitle: 'Hermes завершил' } },
  boot: { ready: 'Hermes Desktop готов' },
  sharedMetrics: { consentTitle: 'Помогите улучшить Hermes' },
  settings: { notifications: { focusedHint: n => `Пока Hermes в фоне (${n})` } },
  commands: { cli: 'Запустите hermes update' }
})

test('brandTexts: подсказки поля ввода и строка заставки — фирменные', async () => {
  const { mod } = await loadPlugin()
  const out = mod.brandTexts(catalog())
  assert.deepEqual(out.composer.newSessionPlaceholders, [
    'Какую систему разбираем?',
    'Где теряются деньги?',
    'Маркетинг, продажи, аналитика или продукт?',
    'С какой цифры начнём?',
    'Что сейчас не сходится?'
  ])
  assert.deepEqual(out.composer.followUpPlaceholders, ['Добавьте вводные', 'Что проверить дальше?', 'Копнуть глубже?'])
  const line = 'ABRAXUS / SYSTEM CORE на связи. Опишите задачу — разложу её по системе.'
  for (const key of ['none', 'default', 'neutral', '']) assert.deepEqual(out.intro.stock[key], [line], key)
  assert.deepEqual(out.intro.custom('kawaii'), [line], 'любая личность агента')
})

test('brandTexts: Hermes → ABRAXUS в обычных текстах, включая функции', async () => {
  const { mod } = await loadPlugin()
  const out = mod.brandTexts(catalog())
  assert.equal(out.sessionImport.continue, 'Продолжить в ABRAXUS')
  assert.equal(out.notifications.native.turnDoneTitle, 'ABRAXUS завершил')
  assert.equal(out.settings.notifications.focusedHint(3), 'Пока ABRAXUS в фоне (3)')
  assert.equal(out.sessionImport.subtitle, undefined, 'строки без Hermes не переопределяются')
})

test('brandTexts: служебное остаётся Hermes, команды не трогаются', async () => {
  const { mod } = await loadPlugin()
  const out = mod.brandTexts(catalog())
  assert.equal(out.notifications.updateHermes, undefined, 'обновление')
  assert.equal(out.boot, undefined, 'запуск')
  assert.equal(out.sharedMetrics, undefined, 'телеметрия Nous')
  assert.equal(out.composer.placeholderStarting, undefined, 'запуск бэкенда')
  assert.equal(out.commands, undefined, 'hermes update со строчной — команда')
})

const mountTexts = async over => {
  const { contributions, disposers } = await loadPlugin()
  const slot = contributions.find(c => c.area === 'titleBar.center')
  const state = sdkState({ t: catalog(), ...over })
  const run = () => {
    state.effects = []
    const element = slot.render()
    assert.equal(element.type(element.props), null, 'ничего не рисует')
    state.effects.forEach(fn => fn())
  }
  return { slot, state, run, disposers }
}

test('тексты регистрируются для активного языка при теме ABRAXUS и снимаются при смене темы', async () => {
  const { state, run, slot } = await mountTexts()
  assert.equal(slot.id, 'texts')
  run()
  assert.equal(state.locales.length, 1)
  assert.equal(state.locales[0].id, 'ru')
  assert.equal(state.locales[0].registration.translations.sessionImport.continue, 'Продолжить в ABRAXUS')
  state.themeName = 'nous'
  run()
  assert.equal(state.locales[0].disposed, true, 'другая тема — тексты Hermes')
})

test('после регистрации каталог уже без Hermes — повторной регистрации нет (без цикла)', async () => {
  const { mod } = await loadPlugin()
  const { state, run } = await mountTexts()
  run()
  const registered = state.locales[0].registration.translations
  state.t = { ...catalog(), ...JSON.parse(JSON.stringify(registered)) }
  state.t.settings = { notifications: { focusedHint: registered.settings.notifications.focusedHint } }
  state.t.intro = registered.intro
  run()
  assert.equal(state.locales.length, 1, 'та же регистрация')
  assert.equal(state.locales[0].disposed, false)
  assert.ok(mod.brandTexts)
})

test('смена языка — регистрация для нового языка', async () => {
  const { state, run } = await mountTexts()
  run()
  state.locale = 'en'
  run()
  assert.equal(state.locales.length, 2)
  assert.equal(state.locales[0].disposed, true)
  assert.equal(state.locales[1].id, 'en')
})

test('выключение плагина снимает тексты', async () => {
  const { state, run, disposers } = await mountTexts()
  run()
  disposers.forEach(fn => fn())
  assert.equal(state.locales[0].disposed, true)
})

test('названия продуктов Nous (Hermes Cloud/Desktop/Agent) и настройки подключений не переименовываются', async () => {
  const { mod } = await loadPlugin()
  const out = mod.brandTexts({
    settings: {
      searchPlaceholder: { about: 'О Hermes Desktop' },
      gateway: { localDesc: 'Запускает бэкенд Hermes', cloudTitle: 'Hermes Cloud' },
      connections: { kindSshDesc: 'Установка Hermes по SSH' },
      appearance: { colorModeDesc: 'Позвольте Hermes следовать системе', cloud: 'Войти в Hermes Cloud, где Hermes ждёт' }
    }
  })
  assert.equal(out.settings.searchPlaceholder, undefined, 'Hermes Desktop')
  assert.equal(out.settings.gateway, undefined)
  assert.equal(out.settings.connections, undefined)
  assert.equal(out.settings.appearance.colorModeDesc, 'Позвольте ABRAXUS следовать системе')
  assert.equal(out.settings.appearance.cloud, 'Войти в Hermes Cloud, где ABRAXUS ждёт')
})

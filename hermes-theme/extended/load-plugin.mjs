// Загружает plugin.js в Node без Hermes: подменяет @hermes/plugin-sdk, react и
// react/jsx-runtime заглушками. Нужен тестам и check.mjs, в Hermes не ставится.
import { registerHooks } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const PLUGIN_FILE = join(dirname(fileURLToPath(import.meta.url)), 'plugin.js')

const STUBS = {
  '@hermes/plugin-sdk': `
    const s = () => globalThis.__abxSdk
    export const THEMES_AREA = 'themes'
    export const STATUSBAR_AREAS = { left: 'statusBar.left', right: 'statusBar.right' }
    export const TITLEBAR_AREAS = { left: 'titleBar.left', center: 'titleBar.center', right: 'titleBar.right' }
    export const PALETTE_AREA = 'palette'
    export const ROUTES_AREA = 'routes'
    export const SIDEBAR_NAV_AREA = 'sidebar.nav'
    export const SESSION_ROW_AREAS = { leading: 'sessionRow.leading', trailing: 'sessionRow.trailing' }
    export const atom = initial => {
      let value = initial
      return { get: () => value, set: next => { value = next } }
    }
    export const host = {
      state: { busy: 'busy-atom', focusedStoredSessionId: { get: () => s().focused ?? null } },
      request: async (method, params) => {
        s().requests.push([method, params])
        return s().sessionList
      },
      navigate: path => s().navigations.push(path),
      composer: {
        insertText: async (sessionId, text) => {
          s().inserts.push([sessionId, text])
          return s().insertResults.length ? s().insertResults.shift() : true
        }
      },
      i18n: {
        registerAppLocale: (id, registration) => {
          const entry = { id, registration, disposed: false }
          s().locales.push(entry)
          return () => { entry.disposed = true }
        }
      }
    }
    export const useTheme = () => ({ themeName: s().themeName })
    export const useI18n = () => ({ locale: s().locale, t: s().t })
    export const useValue = a => (a === 'busy-atom' ? s().busy : typeof a?.get === 'function' ? a.get() : undefined)`,
  react: `
    const s = () => globalThis.__abxSdk
    export const useState = init => [typeof init === 'function' ? init() : init, value => { s().lastSet = value }]
    export const useEffect = fn => { s().effects.push(fn) }`,
  'react/jsx-runtime': `
    export const jsx = (type, props) => ({ type, props })
    export const jsxs = jsx`
}

let hooked = false

function installHooks() {
  if (hooked) return
  hooked = true
  registerHooks({
    resolve(specifier, context, next) {
      return specifier in STUBS ? { url: `abx-stub:${specifier}`, shortCircuit: true } : next(specifier, context)
    },
    load(url, context, next) {
      return url.startsWith('abx-stub:')
        ? { format: 'module', source: STUBS[url.slice('abx-stub:'.length)], shortCircuit: true }
        : next(url, context)
    }
  })
}

export function sdkState(over = {}) {
  globalThis.__abxSdk = {
    themeName: 'abraxus-extended', busy: false, effects: [], locales: [], locale: 'ru', t: {},
    requests: [], navigations: [], inserts: [], insertResults: [], sessionList: { sessions: [] }, focused: null,
    ...over
  }
  return globalThis.__abxSdk
}

let loads = 0

export async function loadPlugin(over = {}) {
  installHooks()
  sdkState(over)
  const mod = await import(`${pathToFileURL(PLUGIN_FILE).href}?load=${++loads}`)
  const contributions = []
  const disposers = []
  const events = {}
  const stored = {}
  const ctx = {
    source: 'plugin:abraxus-extended',
    storage: {
      get: (key, fallback) => (key in stored ? stored[key] : fallback),
      set: (key, value) => { stored[key] = value },
      remove: key => { delete stored[key] }
    },
    onEvent: (type, listener) => {
      ;(events[type] ??= []).push(listener)
      return () => {}
    },
    register: c => {
      contributions.push(c)
      return () => {}
    },
    onDispose: fn => disposers.push(fn)
  }
  mod.default.register(ctx)
  return { mod, plugin: mod.default, contributions, disposers, events, stored }
}

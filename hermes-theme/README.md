# ABRAXUS Theme Pack для Hermes

Фирменное оформление Hermes (CLI, TUI, Desktop) по дизайн-системе a-bra.ru. К сайту не подключается и в сборку Vite не попадает — как `sheets/` и `reports/`.

```
hermes-theme/
  tokens.json      ← единственный источник цветов для всех этапов
  standard/        ← ЭТАП 1: YAML-скин, только штатный механизм Hermes
  extended/        ← ЭТАП 2: Desktop Theme Plugin abraxus-extended
```

## Два этапа

**STANDARD** (`standard/`, v1.0) — один файл `abraxus.yaml` в `~/.hermes/skins/`. Палитра всех 44 цветовых токенов, брендинг, приветствие, спиннер, ASCII-логотип и знак. Работает в CLI, TUI и — в пределах того, что Desktop берёт из YAML, — в Desktop. Подробности и ограничения — `standard/README.md`.

**EXTENDED** (`extended/`, v1.0) — Desktop Theme Plugin `abraxus-extended` (`~/.hermes/desktop-plugins/`): точная тёмная палитра, Inter, медная заливка кнопок, поля 3:1, знак ABRA на заставке нового чата и в строке статуса. Подробности — спецификация `docs/superpowers/specs/2026-10-08-abraxus-extended-design.md`, установка — `extended/INSTALL.md`.

Этапы независимы: EXTENDED не требует STANDARD и наоборот. Имя темы плагина должно отличаться от `abraxus` — иначе Desktop предпочтёт YAML-версию (`resolveTheme`: built-in → user → backend → contributed).

## Правило палитры

Цвет меняется только в `tokens.json`, потом переносится в потребителей:

- `standard/abraxus.yaml` — каждый цвет помечен `# token: <имя>`, `standard/check.py` падает, если значение разошлось с токеном;
- `extended/plugin.js` — блок `ABX` пишет `node extended/build.mjs` из `tokens.json`; `extended/check.mjs` падает, если блок отстал.

В `tokens.json` нет новых цветов: `base` — значения из `src/style.css` и `abra-tokens.css` (проверка ищет их там), `derived` — их смеси «фон + (цвет − фон) × alpha», как блок [SHEETS] в `abra-tokens.css`. Если меняется цвет на сайте — сначала `abra-tokens.css`/`style.css`, затем `tokens.json`, затем скин; `check.py` покажет, что ещё не догнали.

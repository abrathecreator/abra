# ABRAXUS Theme Pack для Hermes

Фирменное оформление Hermes (CLI, TUI, Desktop) по дизайн-системе a-bra.ru. К сайту не подключается и в сборку Vite не попадает — как `sheets/` и `reports/`.

```
hermes-theme/
  tokens.json      ← единственный источник цветов для всех этапов
  standard/        ← ЭТАП 1: YAML-скин, только штатный механизм Hermes
  extended/        ← ЭТАП 2: Desktop Theme Plugin (ещё не начат)
```

## Два этапа

**STANDARD** (`standard/`, v1.0) — один файл `abraxus.yaml` в `~/.hermes/skins/`. Палитра всех 44 цветовых токенов, брендинг, приветствие, спиннер, ASCII-логотип и знак. Работает в CLI, TUI и — в пределах того, что Desktop берёт из YAML, — в Desktop. Подробности и ограничения — `standard/README.md`.

**EXTENDED** (`extended/`, не реализован) — официальный Desktop Theme Plugin (`~/.hermes/desktop-plugins/`): SVG-знак, анимация, Inter и Syne, отдельные палитры, допустимый customCSS. Закрывает то, что STANDARD не может: шрифты, светлую тему, медную заливку кнопок, обводку полей 3:1.

Этапы независимы: EXTENDED не требует STANDARD и наоборот. Имя темы плагина должно отличаться от `abraxus` — иначе Desktop предпочтёт YAML-версию (`resolveTheme`: built-in → user → backend → contributed).

## Правило палитры

Цвет меняется только в `tokens.json`, потом переносится в потребителей:

- `standard/abraxus.yaml` — каждый цвет помечен `# token: <имя>`, `standard/check.py` падает, если значение разошлось с токеном;
- EXTENDED будет читать `tokens.json` напрямую.

В `tokens.json` нет новых цветов: `base` — значения из `src/style.css` и `abra-tokens.css` (проверка ищет их там), `derived` — их смеси «фон + (цвет − фон) × alpha», как блок [SHEETS] в `abra-tokens.css`. Если меняется цвет на сайте — сначала `abra-tokens.css`/`style.css`, затем `tokens.json`, затем скин; `check.py` покажет, что ещё не догнали.

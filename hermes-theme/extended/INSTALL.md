# ABRAXUS EXTENDED — установка, обновление, удаление

Плагин — один файл `plugin.js`. Hermes подхватывает его без перезапуска. STANDARD (`abraxus.yaml`) не трогается и остаётся для терминала.

## 0. Проверить

```bash
node ~/Documents/abrasite/hermes-theme/extended/check.mjs
```

Должно закончиться `OK: 0 ошибок`.

## 1. Установить

```bash
ls ~/.hermes/desktop-plugins/abraxus-extended
```

«No such file» — можно ставить:

```bash
mkdir -p ~/.hermes/desktop-plugins/abraxus-extended
```

```bash
cp ~/Documents/abrasite/hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js
```

Через несколько секунд в Hermes: Settings → Appearance → **ABRAXUS** (или `/skin abraxus-extended` в поле ввода). Если пункта нет — ⌘K → Reload desktop plugins.

## 2. Что проверить

- Новый сеанс: вместо HERMES AGENT — медный знак, по контуру бежит светлый штрих.
- Строка статуса слева: маленький знак; пока агент отвечает — точка вращается.
- Поля и чекбоксы в настройках видны (обводка 3:1).
- Системные настройки → Универсальный доступ → Дисплей → «Уменьшить движение»: всё статично.

## 3. Обновить

После правки `hermes-theme/tokens.json`:

```bash
node ~/Documents/abrasite/hermes-theme/extended/build.mjs
```

```bash
node ~/Documents/abrasite/hermes-theme/extended/check.mjs
```

```bash
cp ~/Documents/abrasite/hermes-theme/extended/plugin.js ~/.hermes/desktop-plugins/abraxus-extended/plugin.js
```

После каждого `hermes update` — снова `check.mjs`: пункт 6 скажет, если Hermes переименовал то, на что опирается плагин.

## 4. Удалить

Сначала выбрать другую тему (например, Abraxus из STANDARD), иначе Desktop откатится на Nous. Затем:

```bash
rm -r ~/.hermes/desktop-plugins/abraxus-extended
```

## Превью

`preview.html` импортирует сам `plugin.js`, поэтому открывается только через сервер (Chrome не запускает модули со страницы, открытой как файл):

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory ~/Documents/abrasite/hermes-theme/extended
```

Затем открыть http://localhost:8765/preview.html.

## Если что-то пошло не так

| Что видно | Причина | Что делать |
|---|---|---|
| Уведомление об ошибке плагина | ошибка в `plugin.js` | `check.mjs`, прислать текст уведомления |
| На заставке снова HERMES AGENT | Hermes поменял вёрстку заставки | `check.mjs` п. 6; тема работает |
| Системный шрифт вместо Inter | нет интернета | ничего, вернётся с сетью |
| Знака в строке статуса нет | выбрана другая тема или знак скрыт меню строки статуса | выбрать ABRAXUS / включить в меню |

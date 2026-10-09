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
- Строка статуса слева: знак в кольце (анимация ORBITAL, как у эмодзи в Telegram); пока агент отвечает — маркер идёт по кольцу.
- Слева в боковой панели пункт **ABRAXUS**: страница с поворачивающимся знаком, девизом, карточками задач и методом.
- ⌘K → «Задача: …» или карточка на странице ABRAXUS — текст задачи появляется в поле ввода, не отправляется. `{клиент}`, `{период}` и т. п. заменить и отправить самому.
- У сеансов в боковой панели — значки: медная точка — клиент, медное кольцо — ABRA, серая точка — техническое. Своя метка открытому сеансу: ⌘K → «Метка сеанса: …» («Автоматически» — вернуть подбор по названию).
- Поля и чекбоксы в настройках видны (обводка 3:1).
- Метки боковой панели — `[ .ЗАКРЕПЛЁННЫЕ ]`, `[ .СЕАНСЫ ]`, без квадратика.
- Поле ввода — медные уголки; щелчок в поле — уголки смыкаются в рамку.
- Подсказки в пустом поле — «Какую систему разбираем?» и др.; под знаком на заставке — «ABRAXUS / SYSTEM CORE на связи…».
- В интерфейсе вместо Hermes — ABRAXUS (служебные сообщения и «Hermes Cloud» остаются как есть). Полный список: `node ~/Documents/abrasite/hermes-theme/extended/check.mjs --names`.
- Settings → Appearance → включить фон за перепиской — вместо статуи созвездие.
- Ответы агента — с медной линией слева, курсор в поле — медный.
- Системные настройки → Универсальный доступ → Дисплей → «Уменьшить движение»: всё статично.

## 3. Обновить

После правки `hermes-theme/tokens.json`, `content.json` (девиз, метки и их слова, задачи, метод) или анимаций в `abra-motion/src/`:

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

## Агент называет себя ABRAXUS

Первая строка `~/.hermes/SOUL.md` (резервная копия — `SOUL.md.bak-abraxus`):

```
You are ABRAXUS — SYSTEM CORE, running on Hermes Agent by Nous Research.
```

Вернуть как было:

```bash
cp ~/.hermes/SOUL.md.bak-abraxus ~/.hermes/SOUL.md
```

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
| Метки без скобок или поле с серой рамкой | Hermes поменял вёрстку меток или поля | `check.mjs` п. 6; тема работает |
| Системный шрифт вместо Inter | нет интернета | ничего, вернётся с сетью |
| Снова «Hermes» в подписях или прежние подсказки | выбрана другая тема (тексты живут только с ABRAXUS) | выбрать ABRAXUS |
| Фон-статуя вместо созвездия | Hermes поменял вёрстку фона | `check.mjs` п. 6; тема работает |
| Знака в строке статуса нет | выбрана другая тема или знак скрыт меню строки статуса | выбрать ABRAXUS / включить в меню |

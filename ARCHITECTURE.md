# Архитектура проекта ABRA

Техническая документация для разработчика, который впервые открывает этот репозиторий. Для контекста, оптимизированного под ИИ-ассистента, см. [CLAUDE.md](CLAUDE.md) — там то же самое, но плотнее и с акцентом на "что нельзя менять без спроса".

## 1. Что это

Одностраничный (по факту — многостраничный: главная + 3 юридические страницы) сайт-визитка "ABRA". Цель страницы — довести посетителя до одного действия: заявка на бесплатный 30-минутный видеозвонок, через форму обратной связи или mailto-ссылку.

Прод: **https://abra-9bm.pages.dev/**
Репозиторий: **https://github.com/abrathecreator/abra**

## 2. Быстрый старт

```bash
npm install
npm run dev       # dev-сервер Vite, localhost:5173
npm run build     # прод-сборка в dist/
npm run preview   # локальный просмотр прод-сборки
```

Node.js: локально используется 21.1.0 (не LTS), CI ожидает `^18 || ^20 || >=22` (требование Vite 6). См. `TECHDEBT.md`.

## 3. Стек и почему именно так

| Технология | Роль | Почему |
|---|---|---|
| Vite 6 | сборка, dev-сервер | multi-page build "из коробки", нулевой конфиг для простого сайта |
| Vanilla JS (ES-модули) | вся интерактивность | сайт маленький, framework — избыточный вес и сложность |
| GSAP 3 + ScrollTrigger | scroll-анимации | единственная сторонняя JS-зависимость; индустриальный стандарт для таймлайнов и scroll-triggered reveal |
| Canvas 2D | созвездие на фоне hero | раньше был Three.js/WebGL — заменён на ручной Canvas 2D, бандл упал с 579.72KB (163.65KB gzip) до 120.40KB (47.63KB gzip) |
| Один CSS-файл, custom properties | вся стилистика | без Sass/Tailwind — проект достаточно мал, чтобы это осложняло, а не упрощало жизнь |
| Formspree | приём формы | нет бэкенда, простой сторонний приёмник (см. риски в разделе 12) |
| Яндекс.Метрика | аналитика | основная аудитория — РФ |

Осознанно **не используется**: React/Vue/Svelte, Tailwind, CSS-in-JS, бандл иконок (Lucide/Heroicons/FontAwesome — все иконки сайта нарисованы вручную под собственный визуальный язык), TypeScript.

## 4. Структура репозитория

```
index.html              Главная страница — вся разметка in-place, без шаблонизатора
privacy.html             Политика конфиденциальности
terms.html                Пользовательское соглашение
consent.html               Согласие на обработку ПДн
src/
  main.js                Entry point index.html: GSAP-таймлайны, воронка, submit формы
  hero.js                 initHero(canvas) — Canvas 2D созвездие с параллаксом от курсора
  icons.js                 SVG-разметка 7 иконок разделов (чистые данные)
  section-icons.js          Монтирование иконок + IntersectionObserver reveal-логика
  metrica.js                Яндекс.Метрика (отдельный модуль ради CSP)
  legal.js                  Entry point для privacy/terms/consent.html
  style.css                 Все стили сайта, один файл, ~1900 строк
public/
  _headers                 HTTP-заголовки для Cloudflare Pages (CSP и т.д.)
  robots.txt, favicon.svg, apple-touch-icon.png, og.png, mark.svg, portrait.webp
.claude/launch.json         Конфиг dev-сервера для Claude Code превью-инструментов
vite.config.js               Multi-page build + переключатель base-path
TECHDEBT.md                   Открытые задачи и риски
CLAUDE.md                      Контекст для ИИ-ассистента
ARCHITECTURE.md                 Этот файл
```

`vite.config.js` собирает 4 отдельные HTML-страницы через `rollupOptions.input` (main/privacy/consent/terms) — это и есть "multi-page build", каждая страница получает свой JS-бандл, но делит общий `style.css` и общий Vite-раннер.

## 5. Дизайн-система

Все цвета, шрифты и базовые размеры — CSS custom properties в `:root` (`src/style.css:1`):

```css
--bg: #0C0B09;             /* фон страницы */
--bg-warm: #131210;         /* фон карточек/полей — чуть теплее основного */
--accent: #B87333;          /* медный акцент — ЕДИНСТВЕННЫЙ цвет для hover/фокуса/акцентов */
--text: #CEC9C3;            /* вторичный текст */
--snow: #EDEBE6;            /* яркий текст — заголовки, важные лейблы */
--border: rgba(206,201,195,0.07);
--font-display: "Syne", "Inter", system-ui, sans-serif;
--font-body: "Inter", system-ui, sans-serif;
--max-w: 1240px;
--gutter: clamp(20px, 4vw, 56px);
```

**Правило**: новый цвет в проект не добавляется. Если нужен приглушённый/полупрозрачный вариант — берётся rgb-триплет существующего токена с нужной alpha (пример — `--border` это `rgba(206,201,195,0.07)`, тот же триплет, что у `--text`).

Шрифты — Google Fonts (Syne для заголовков/лейблов/кнопок, Inter для текста), подключены через `<link>` в `<head>` с `preconnect`.

Брейкпоинты, которые встречаются по всему CSS: `900px` (hero и общая desktop/mobile граница), `620px`/`560px` (частные случаи — шаги метода, воронка), `480px` (мелкие элементы вроде размера иконок).

## 6. Композиция главной страницы

Порядок секций в `index.html`: `hero` → `insight` (01) → `system` (02) → `services` (03) → `method` (04) → `philosophy` (05) → `cta` (06) → `contact` (07).

Секции 01–04 используют общий паттерн `.section__head` (`.tag` + `.section__title`, иногда `.section__note`), центрированный как блок (`text-align:center; margin:0 auto`). `philosophy` и `contact` центрируются вручную теми же приёмами, но без обёртки `.section__head` — у них своя структура (`.philosophy__content`, `.contact__inner`).

Метки разделов используют фирменный текстовый формат **`[ .Название ]`** (квадратная скобка, пробел, точка вплотную к слову, пробел, закрывающая скобка) вместо прежней нумерации "01 · Название" — сознательное решение, не дефолт библиотеки.

## 7. Компоненты

### `.abra-cta` — первичная кнопка

Три использования: hero, mailto-ссылка в разделе `cta`, submit-кнопка формы контакта. Концепция — уголки-скобки, которые **достраиваются в полную рамку при hover/focus**:

```
[    ]  →  hover  →  [━━━━]
```

- Параметры через custom properties прямо на `.abra-cta`: `--cta-h`, `--cta-pad-x`, `--cta-bracket-span`, `--cta-corner-h/w`, `--cta-shift`, `--cta-stroke`
- 4 угла (`.abra-cta__corner--tl/tr/bl/br`) растут по ширине до `calc(50% + 1px)` на hover — из этого и складывается эффект "рамка достроилась"
- Стрелки в компоненте нет и не было в текущей версии — раньше эксперимент со стрелкой убрали по итогам ревью, лейбл центрирован симметричным паддингом
- `@media (hover:hover) and (pointer:fine)` — полноценный hover-эффект на десктопе; `@media (hover:none)` — тот же эффект через `:active` на тач-устройствах
- `[data-state="loading"]` — состояние во время отправки формы, управляется из `main.js`

### `.abra-link` — вторичная кнопка

Компаньон к `.abra-cta` ("Посмотреть услуги" в hero) — намеренно не вторая акцентная кнопка, а тихий текстовый линк с подчёркиванием, которое проявляется на hover.

### Система иконок разделов

См. подробно раздел 8 ниже.

### Воронка (`.funnel`, раздел Insight)

Список стадий ("Трафик → Обращение → ... → Повтор") со стрелками между ними.

- **Desktop/tablet (>560px)**: `flex-flow: row wrap; justify-content: center` — центрированные строки. `updateFunnelArrows()` в `main.js` прячет стрелку у элемента, ставшего первым в новой строке (сравнивает `getBoundingClientRect().top` соседних элементов)
- **Mobile (≤560px)**: `flex-direction: column` — строгий вертикальный список, стрелки развёрнуты на 90° вниз (тот же CSS-приём "уголок + rotate(45deg)", что и в остальных стрелках сайта, но собран из других сторон border). На этой ширине стрелки принудительно `display:block !important`, потому что построчная логика `updateFunnelArrows()` в column-режиме считала бы каждый элемент новой строкой и прятала бы все стрелки — override в CSS это подавляет

### Карточки / грид / шаги

`.cards` (раздел System), `.services__grid` (раздел Services), `.steps` (раздел Method) — стандартные CSS Grid/flex раскладки без специфической логики, реагируют на `ScrollTrigger` для reveal-анимации.

### Форма обратной связи

`#contact-form` в разделе `contact`. Поля:

| Поле | type | required | Примечание |
|---|---|---|---|
| Имя | text | да | |
| Номер телефона | tel | нет | placeholder `+7 999 123-45-67`, `autocomplete="tel"` |
| Что сейчас не работает | textarea | да | |
| Что уже пробовали | textarea | нет | |
| Ссылка на сайт | url | нет | placeholder `https://` |
| Telegram или email | text | да | placeholder `@username или name@mail.com` |
| Согласие на ПДн | checkbox | да | |

Плюс скрытый honeypot-инпут `_gotcha` (антиспам, не убирать и не показывать).

Все текстовые плейсхолдеры гаснут сразу по фокусу поля (`:focus::placeholder { opacity:0 }` с transition), а не только когда пользователь начал печатать.

Отправка — AJAX `fetch()` на `action="https://formspree.io/f/mjybyyav"` (см. `main.js`, обработчик `submit`). Перед отправкой JS вручную проверяет чекбокс согласия (на случай обхода браузерной валидации) и наличие реального Formspree ID в `action`. Во время запроса кнопка получает `data-state="loading"` (блокирует повторный submit через `pointer-events:none` в CSS + JS-флаг).

### Hero + Canvas-созвездие

`hero.js` экспортирует `initHero(canvas)` — рисует 90 узлов, соединяет линиями по расстоянию (Canvas 2D, `requestAnimationFrame`), с лёгким параллаксом от движения курсора (`pointermove`). На мобиле (≤900px) добавляется CSS `heroPortraitBreath` — едва заметное дыхание портрета через `animation`, отключается под `prefers-reduced-motion`.

## 8. Система иконок разделов — подробно

Полностью авторская, без библиотек. Принцип: **STATIC MEANING + MOTION MEANING** — статичная геометрия должна быть узнаваема сама по себе, а motion при взаимодействии — проигрывать смысл раздела, а не просто украшать.

### Файлы

- `src/icons.js` — объект `SECTION_ICONS`, ключ = тип (`insight`, `system`, `services`, `method`, `philosophy`, `connect`, `contact`), значение = строка с полной SVG-разметкой (`viewBox="0 0 64 64"` у всех)
- `src/section-icons.js` — `initSectionIcons(root = document)`:
  1. Находит все `[data-icon]`, вставляет соответствующий SVG из `SECTION_ICONS`, вешает классы `section-icon section-icon--<type>`
  2. При `prefers-reduced-motion: reduce` — на этом всё, дальше не выполняется (иконка остаётся статичной)
  3. Иначе создаёт один `IntersectionObserver` (threshold 0.3) на все иконки: при первом появлении в viewport добавляет класс `.is-revealed` и **отписывает элемент от observer** — анимация проигрывается один раз и класс больше никогда не убирается (иконка остаётся в "завершённом" виде навсегда)

### CSS (`src/style.css`, блок "SECTION ICONS", после строки ~1450)

Общие классы на примитивах внутри SVG:

- `.icon-base` — статичная структурная геометрия, всегда видна, цвет `var(--icon-base)`
- `.icon-guide` — едва заметные направляющие, "дорисовываются" через `stroke-dasharray:1; stroke-dashoffset:1→0` (используется `pathLength="1"` на `<line>`/`<path>`, чтобы не считать реальную длину пути)
- `.icon-fill` / `.icon-stroke` — элементы, которые в состоянии покоя приглушены, а при триггере становятся `var(--icon-accent)`

Триггеры для каждого типа продублированы в двух местах с одинаковым конечным CSS-состоянием:

```css
.section-icon--insight.is-revealed .icon-insight__point { /* конечное состояние */ }

@media (hover: hover) and (pointer: fine) {
  .section-icon--insight:hover .icon-insight__point { /* то же самое состояние */ }
}
```

`:focus-visible` сознательно не используется — `.section-icon` это декоративный `<span>` без `tabindex`, реального фокуса на нём быть не может, и по доступности он не должен быть отдельной точкой табуляции.

### Цвета

`--icon-base`/`--icon-guide`/`--icon-accent` определены в собственном `:root`-блоке внутри секции иконок (используют тот же rgb-триплет, что и `--text`, плюс `var(--accent)`). Раньше у раздела Philosophy было переопределение этих переменных под светлый фон (`.philosophy .section-icon { ... }`) — убрано вместе с самой светлой темой Philosophy, сейчас все 7 иконок используют один и тот же набор цветов.

### Размер

`--icon-size: clamp(36px, 6vw, 58px)` — одна переменная на `.section-icon`, плавное масштабирование без брейкпоинтов.

### Тайминги

Все `transition`/`animation`-длительности в этом блоке **удвоены** относительно первой реализации (по прямой просьбе после ревью). Если понадобится снова менять скорость — меняй пропорционально по всем 7 иконкам разом, а не точечно у одной: hover и `.is-revealed` должны заканчиваться синхронно, иначе хореография (`transition-delay` между частями одной иконки) рассинхронизируется.

### Как добавить новую иконку

1. Добавить SVG-разметку в `SECTION_ICONS` в `icons.js` (тот же `viewBox`, использовать `.icon-base`/`.icon-guide`/`.icon-fill`/`.icon-stroke` + свои part-классы вида `.icon-<type>__<part>`)
2. Добавить CSS-блок в стиле уже существующих семи (default state → `.is-revealed`/`:hover` end state, с `transition-delay` для хореографии, если элементов несколько)
3. Разметка использования: `<span class="section-icon" data-icon="<type>" aria-hidden="true"></span>` внутри `.tag`
4. `initSectionIcons()` уже обработает новый `data-icon` автоматически — менять `section-icons.js` не нужно, если не меняется сама механика reveal/hover

## 9. GSAP-анимации

Все анимации — в `src/main.js`, единый паттерн `gsap.from(target, { scrollTrigger: {...}, y, opacity, duration, ease: "power3.out" })`.

- Hero — один `gsap.timeline()`, элементы входят последовательно по `heroIntroSelectors`. Обёрнут в `try/catch` + safety-net `setTimeout(2500)`, который форсит `opacity:1` всем элементам таймлайна, если что-то пошло не так (медленная загрузка, ошибка браузера) — не убирать этот fallback.
- `ScrollTrigger` триггеры: `.section__head`, `.funnel`, `.cards .card`, `.services__grid .service`, `.step`, `.philosophy__title/text` (плюс scrub-параллакс на `.philosophy__mark`), `.cta__inner > *`, `.contact__inner > *`
- `window.addEventListener("load", () => ScrollTrigger.refresh())` — пересчитывает позиции триггеров после полной загрузки (шрифты/картинки могли сдвинуть layout)

## 10. SEO и метатеги

`index.html` содержит: `<title>`, `meta description`, `canonical`, полный набор Open Graph (`og:*`) и Twitter Card метатегов, `favicon.svg` + `apple-touch-icon.png`. `robots.txt` есть в `public/`, `sitemap.xml` — нет (см. TECHDEBT, для одностраничника пока не критично).

## 11. Безопасность

CSP и остальные security-заголовки — в `public/_headers`, применяются Cloudflare Pages как **настоящие HTTP-заголовки** (не `<meta http-equiv>` — meta игнорирует `frame-ancestors` и `form-action`, поэтому только так):

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' https://mc.yandex.ru ...
```

`metrica.js` вынесен в отдельный ES-модуль специально, чтобы Яндекс.Метрику можно было подключать без `unsafe-inline` в `script-src`.

При добавлении новой сторонней интеграции (виджет, шрифт, скрипт) — не забыть добавить домен в соответствующую директиву CSP, иначе он молча заблокируется в браузере.

## 12. Юридические страницы

`privacy.html`, `terms.html`, `consent.html` — статичная разметка, общий `src/legal.js` (просто `style.css` + `metrica.js`, уникальной JS-логики нет). Ссылки на них — в футере главной страницы и в форме (согласие на обработку ПДн).

## 13. Деплой

- **Основной**: Cloudflare Pages, автодеплой при push в `main`, прод — `https://abra-9bm.pages.dev/`
- **Резервный (fallback)**: GitHub Pages. Переключается через переменную окружения `DEPLOY_TARGET=gh-pages`, которая меняет `base` в `vite.config.js` с `/` на `/abra/` (нужно для корректных путей на project pages URL вида `username.github.io/abra/`). Держится осознанно как запасной вариант.
- После каждого push в `main` стоит проверять, что Cloudflare реально выкатил новую версию, а не полагаться на факт пуша:
  ```bash
  npm run build
  curl -s https://abra-9bm.pages.dev/ | grep -o 'assets/main-[^"]*\.js'
  # сравнить хэш с тем, что лежит в dist/assets после локальной сборки
  ```

## 14. Известные проблемы

Полный список с деталями — `TECHDEBT.md`. Кратко:

- **Высокий приоритет**: форма контакта шлёт данные через Formspree (США), хостинг на Cloudflare (США) — потенциальное несоответствие 152-ФЗ (требование хранить/собирать ПДн россиян на серверах в РФ). Риск сейчас низкий (минимальный трафик), но обязательно закрыть до платного продвижения.
- Git-коммиты идут с автоопределённым `ABRA CADABRA <...@MacBook-Air-ABRA.local>` — стоит настроить нормальную identity.
- Node.js локально не-LTS версия, возможен разъезд с CI.
- Нет `sitemap.xml`, нет тестов (форма — бизнес-критичный узел без покрытия).
- `.claude/launch.json` закоммичен в репозиторий, хотя специфичен только для Claude Code.

## 15. Чеклист перед тем, как что-то менять

1. Прочитать `CLAUDE.md` — там список решений, которые нельзя менять без явного запроса owner'а (формат меток `[ .Название ]`, отсутствие стрелки в CTA, отсутствие отката иконок после reveal и т.д.)
2. `npm run dev`, проверить изменение визуально, не полагаться только на чтение кода
3. Проверить на нескольких viewport: 1440 / 1024 / 768 / 390 / 375 / 320 — минимум мобильный + десктопный
4. `npm run build` — убедиться, что сборка проходит без ошибок
5. Закоммитить, запушить, дождаться реального деплоя на Cloudflare Pages и свериться по хэшу бандла

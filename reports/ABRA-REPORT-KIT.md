# ABRA — дизайн-кит для отчётов-страниц

Ты получил дизайн-кит бренда ABRA. Когда тебя просят сделать отчёт, справку,
разбор или сводку — отдавай их **одной самодостаточной HTML-страницей**,
собранной по этому файлу.

Файл самодостаточный: все значения, стили и разметка лежат внутри. Ничего
скачивать и никуда ходить не нужно. Можно передать его как промпт целиком или
положить в репозиторий как `AGENTS.md`.

Значения взяты из живого CSS сайта **a-bra.ru** — это не «похожий стиль»,
а тот же самый.

---

## Что считается правильным результатом

- **Один файл `.html`.** Без сборки, без зависимостей, без внешних скриптов.
  Единственное внешнее обращение — шрифты Google Fonts.
- Открывается двойным кликом, печатается в PDF, отправляется вложением.
- Работает на телефоне: колонки схлопываются, таблицы прокручиваются вбок.
- Никакого JavaScript, если отчёт статический. Не добавляй интерактив,
  которого не просили.

---

## Жёсткие правила

1. **Новых цветов не вводить.** Разрешены только токены из блока `:root` ниже.
   Нужен оттенок, которого нет — значит, задача решается не цветом,
   а весом, размером или расстоянием.
2. **Один акцент на экран.** Медь `--accent` означает «смотри сюда».
   Если ей выделено больше двух-трёх вещей на видимой области, выделение
   перестало работать.
3. **Цифры никогда не набираются Syne.** Разбор — в разделе «Шрифты».
   Всё числовое идёт `var(--font-body)`. `tabular-nums` — в таблицах, в шапке
   и в подписях графика; в бегущем тексте пропорциональные цифры читаются
   лучше, там он не нужен.
4. **Метки разделов — строго формат `[ .Название ]`:** скобка, пробел, точка
   вплотную к слову, пробел, закрывающая скобка. Это осознанный брендинг,
   отступать от него нельзя.
5. **Две границы разведены намеренно.** `--border` — 1,11:1, только
   декоративные линии и разделители. `--border-control` — 3,25:1, всё, что
   человек должен разглядеть и во что должен попасть. Не подменять одно другим
   и не сводить в одну переменную.
6. **ROI выводится кратностью** (`3,54 ×`), не процентом. Формула
   «валовая прибыль / расходы на привлечение» отвечает «во сколько раз»,
   и `354,5 %` для той же величины читается как «+354 % к вложенному» —
   это другое число. Нужен процент — это ROMI с формулой
   `(прибыль − затраты) / затраты`, и метрику надо переименовать.
7. **Никаких данных «для красоты».** Если цифры нет — блока нет. Не заполняй
   пример правдоподобными числами: отчёт читают как факт.
8. **Тёмная тема — основная,** светлая включается только на печать
   (`@media print` уже в стилях). Не делай переключатель тем, если не просили.
9. Заголовки — предложениями, а не назывными обрубками. «Расход вырос, а
   квалифицированных лидов стало меньше» лучше, чем «Динамика расхода».

---

## Шрифты

| Слой | Гарнитура | Где |
|---|---|---|
| Заголовки, метки, подписи-капсом | **Syne** | `--font-display` |
| Текст и **все без исключения числа** | **Inter** | `--font-body` |

У Syne цифры сделаны старостильными: 5 и 0 ниже высоты прописных, штрихи
неровные, знак ₽ съезжает с базовой линии. Поэтому в стилях ниже стоит
`@font-face` с именем `AbraNumerals` — это файл Inter, ограниченный по
`unicode-range` только цифрами и знаками, которые стоят к ним вплотную:
`+ , - . : % × − – — ₽` и неразрывный пробел. Точка, тире и неразрывный
пробел входят в диапазон намеренно — без них дата `01–31.08.2026`
в заголовке разъедется по двум гарнитурам.
Он стоит **первым** в стеке `--font-display`, поэтому цифры в заголовках
берутся из Inter, а буквы спокойно проваливаются дальше, в Syne.

Так это сделано не от хорошей жизни: вариант с `@font-face` под именем
`"Syne"` и диапазоном весов не работает вообще никогда — Google Fonts
объявляет Syne точными весами, и при запросе веса 600 точное совпадение
выигрывает у диапазона. Отдельное имя семейства первым в списке — единственный
рабочий способ. Не сводить обратно в одно семейство и не менять порядок.

**Буквенно-цифровые аббревиатуры** (`B2B`, `CR1`, `ROI2`) внутри заголовков
оборачивай в `<span class="alnum">`: посимвольный `unicode-range` иначе уводит
цифру в Inter, а буквы оставляет в Syne, и токен разъезжается.

Отказать может любая из двух половин, и симптомы у них разные.

- **Умер файл Inter в `@font-face`** — цифры в заголовках вернутся к Syne
  и поедут. Видно по крупному числу в шапке.
- **Не дошёл CSS Google Fonts** — Syne не загрузится, заголовки молча уйдут
  в `system-ui`, а цифры останутся правильными, потому что `AbraNumerals`
  тянется с `fonts.gstatic.com` напрямую. Число в шапке в этом случае
  выглядит нормально и ничего не подсказывает.

Поэтому проверять надо **букву** в крупном заголовке, а не цифру: если
заголовок потерял характерные широкие овалы Syne — не дошёл шрифтовой CSS.

---

## Стили — вставлять целиком, без правок

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@500;600&family=Inter:wght@400;500;600&display=swap">

<style>
/* Цифры Syne выглядят плохо, поэтому они и всё, что стоит вплотную к ним,
   берутся из Inter. Подробности — в разделе «Шрифты» дизайн-кита. */
@font-face {
  font-family: "AbraNumerals";
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
  src: url("https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2")
    format("woff2");
  unicode-range: U+30-39, U+2B, U+2C, U+2D, U+2E, U+25, U+3A, U+A0, U+B7,
    U+D7, U+2013, U+2014, U+2212, U+20BD;
}

:root {
  --bg: #0C0B09;            /* фон страницы */
  --bg-warm: #131210;       /* карточки, врезки, шапка таблицы */
  --accent: #B87333;        /* медь — единственный акцент, 5,19:1 */
  --text: #CEC9C3;          /* основной текст, 11,9:1 */
  --snow: #EDEBE6;          /* заголовки и важные числа, 16,4:1 */
  --border: rgba(206, 201, 195, 0.07);         /* 1,11:1 — только декор */
  --border-control: rgba(206, 201, 195, 0.45); /* 3,15:1 — фокус, контролы */
  --border-surface: rgba(206, 201, 195, 0.16); /* 1,36:1 — рамки карточек */

  --font-display: "AbraNumerals", "Syne", "Inter", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  --max-w: 1240px;
  --gutter: max(clamp(20px, 4vw, 56px),
             env(safe-area-inset-left), env(safe-area-inset-right));
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

/* Аббревиатуры с цифрами целиком в Inter — иначе токен разъезжается по
   двум гарнитурам. Ставить только на буквенно-цифровое, не на числа. */
.alnum {
  font-family: var(--font-body);
  letter-spacing: 0.01em;
  margin: 0 -0.04em;
}

/* ─── КАРКАС ─────────────────────────────────────────────── */

.report {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: clamp(48px, 8vh, 96px) var(--gutter) 120px;
}

.report__kicker {
  display: block;
  margin: 0 0 40px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent);
}

/* ─── ШАПКА ОТЧЁТА ───────────────────────────────────────── */

.report__hero {
  position: relative;
  overflow: hidden;
  padding: 48px clamp(24px, 4vw, 56px) 40px;
  margin-bottom: 64px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(120% 140% at 15% 0%, rgba(184, 115, 51, 0.22), transparent 60%),
    var(--bg-warm);
}

.report__meta {
  display: block;
  margin: 0 0 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.6;
}

.report__title {
  margin: 0 0 40px;
  max-width: 820px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: var(--snow);
  text-wrap: balance;
  overflow-wrap: break-word;
}

.report__title em {
  font-style: italic;
  font-weight: 500;
  color: var(--accent);
}

.report__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}

.report__stat { display: flex; flex-direction: column; gap: 6px; }

.report__stat-value {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: clamp(26px, 3vw, 34px);
  font-variant-numeric: tabular-nums;
  color: var(--snow);
  white-space: nowrap;
}

.report__stat-value--accent { color: var(--accent); }

.report__stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.6;
}

/* ─── ТЕЛО: САЙДБАР + КОНТЕНТ ────────────────────────────── */

.report__body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 48px;
  align-items: start;
}

.report__sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.report__fact { display: flex; flex-direction: column; gap: 8px; }

.report__fact-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.62;
}

.report__fact-value { font-size: 14px; line-height: 1.5; color: var(--snow); }

.report__tags { display: flex; flex-wrap: wrap; gap: 8px; }

.report__tag {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.85;
}

.report__content { display: flex; flex-direction: column; gap: 48px; }

.report__section-label {
  display: block;
  margin-bottom: 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.report__content h2 {
  margin: 0 0 16px;
  max-width: 640px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(20px, 2vw, 26px);
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--snow);
  text-wrap: balance;
}

.report__content h3 {
  margin: 32px 0 12px;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 17px;
  letter-spacing: 0.01em;
  color: var(--snow);
}

.report__text,
.report__content ul,
.report__content ol {
  max-width: 640px;
  margin: 0 0 24px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text);
  opacity: 0.85;
}

.report__content ul,
.report__content ol { padding-left: 22px; }
.report__content li { margin-bottom: 8px; }

/* ─── СРАВНЕНИЕ «БЫЛО / СТАЛО» ───────────────────────────── */

.report__compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.report__compare-item {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-warm);
}

.report__compare-item--after {
  border-color: rgba(184, 115, 51, 0.35);
  background: linear-gradient(180deg, rgba(184, 115, 51, 0.08), rgba(184, 115, 51, 0));
}

.report__compare-label {
  display: block;
  margin-bottom: 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.62;
}

.report__compare-item--after .report__compare-label {
  color: var(--accent);
  opacity: 1;
}

.report__compare-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.85;
}

/* ─── ТАБЛИЦА ────────────────────────────────────────────── */

.report__table-wrap { overflow-x: auto; }
.report__table-wrap:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.report__table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: 14px;
}

.report__table th,
.report__table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.report__table th {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.62;
  white-space: nowrap;
}

.report__table td {
  color: var(--snow);
  font-variant-numeric: tabular-nums;
}

.report__table td.num,
.report__table th.num { text-align: right; }

.report__table-highlight { color: var(--accent); font-weight: 600; }

.report__table tfoot td {
  border-bottom: 0;
  border-top: 1px solid var(--border-control);
  font-weight: 600;
}

/* ─── ВРЕЗКА И ЦИТАТА ────────────────────────────────────── */

.report__callout {
  max-width: 640px;
  margin: 0;
  padding-left: 20px;
  border-left: 2px solid var(--accent);
}

.report__callout p {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(18px, 2vw, 22px);
  line-height: 1.4;
  color: var(--snow);
}

.report__callout cite {
  font-style: normal;
  font-size: 13px;
  color: var(--text);
  opacity: 0.6;
}

/* ─── ГРАФИК НА CSS ──────────────────────────────────────── */

.report__bars { display: flex; flex-direction: column; gap: 14px; max-width: 640px; }
.report__bar { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; }

.report__bar-label {
  font-size: 13px;
  color: var(--text);
  opacity: 0.85;
}

.report__bar-value {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--snow);
  white-space: nowrap;
}

.report__bar-track {
  grid-column: 1 / -1;
  height: 6px;
  background: var(--bg-warm);
  border-radius: 3px;
  overflow: hidden;
}

.report__bar-fill { display: block; height: 100%; background: var(--accent); }
.report__bar--muted .report__bar-fill { background: var(--text); opacity: 0.35; }

/* ─── КОД ────────────────────────────────────────────────── */
/* Моноширинный блок для разметки, конфигов и команд. Цвета — те же
   токены: подсветки синтаксиса нет и не нужно, читают его глазами,
   а не ищут в нём ошибку. */

.report__code {
  max-width: 640px;
  margin: 0 0 24px;
  padding: 18px 20px;
  overflow-x: auto;
  border: 1px solid var(--border-surface);
  border-radius: 10px;
  background: var(--bg-warm);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  tab-size: 2;
}

.report__code:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.report__code b {
  font-weight: 600;
  color: var(--accent);
}

.report__code-caption {
  display: block;
  margin: -16px 0 24px;
  font-size: 12px;
  color: var(--text);
  opacity: 0.62;
}

/* ─── НЕТ ДАННЫХ И ИСТОЧНИКИ ─────────────────────────────── */
/* Правило «никаких данных для красоты» требует честного способа показать
   пропуск. Пустое место читается как недосмотр, а честный блок — как решение. */

.report__nodata {
  max-width: 640px;
  margin: 0 0 24px;
  padding: 16px 18px;
  border: 1px dashed var(--border-surface);
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.8;
}

.report__nodata b {
  font-weight: 600;
  color: var(--snow);
}

.report__sources {
  max-width: 640px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.8;
}

.report__sources li {
  margin-bottom: 10px;
  padding-left: 20px;
  text-indent: -20px;
}

.report__sources b {
  font-weight: 600;
  color: var(--snow);
}

/* ─── КОНЦОВКА ───────────────────────────────────────────── */

.report__footer {
  max-width: 680px;
  margin: 96px auto 0;
  padding-top: clamp(40px, 6vw, 72px);
  text-align: center;
  border-top: 1px solid var(--border);
}

.report__footer-kicker {
  display: inline-block;
  margin-bottom: 20px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
}

.report__footer-title {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(26px, 3.6vw, 40px);
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: var(--snow);
  text-wrap: balance;
}

.report__footer-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.8;
}

/* ─── АДАПТИВ ────────────────────────────────────────────── */

@media (max-width: 900px) {
  .report__body { grid-template-columns: 1fr; }
  .report__sidebar {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 24px 40px;
  }
  /* Факт с длинным значением («выручка не заполнена…») иначе сжимается
     в колонку по одному слову: у флекс-элемента min-width по умолчанию
     auto, и он не даёт тексту переноситься нормально. */
  .report__fact {
    flex: 1 1 220px;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .report__stats { gap: 28px; }
  .report__compare { grid-template-columns: 1fr; }
  .report__table { font-size: 13px; }
  .report__table th,
  .report__table td { padding: 10px 6px; }
}

/* ─── ПЕЧАТЬ ─────────────────────────────────────────────── */
/* Тёмный фон в печать не годится. Значения — печатная пара токенов
   дизайн-системы. Медь на бумаге даёт 3,17:1 и текстом не годится,
   поэтому в печати акцент уходит в тёмную медь (5,06:1). */

@media print {
  @page { margin: 14mm; }
  :root {
    --bg: #EFEAE2;
    --bg-warm: #E9E4DC;
    --text: #1A1512;
    --snow: #1A1512;
    --accent: #8A5637;
    --border: rgba(26, 21, 18, 0.12);
    --border-control: rgba(26, 21, 18, 0.5);
    --border-surface: rgba(26, 21, 18, 0.25);
  }
  html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .report { padding-top: 24px; }
  .report__hero { background: var(--bg-warm); }
  .report__compare-item--after { background: none; }
  .report__sidebar { position: static; }
  .report__text, .report__content ul, .report__content ol { opacity: 1; }
  .report__section { break-inside: avoid; }
  .report__table tr { break-inside: avoid; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
</style>
```

---

## Скелет страницы

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Название отчёта</title>
<!-- сюда шрифты и <style> целиком -->
</head>
<body>
<main class="report">
  <span class="report__kicker">[ .Отчёт ]</span>

  <header class="report__hero">
    <span class="report__meta">Яндекс Директ · <span class="alnum">B2B</span> · август 2026</span>
    <h1 class="report__title">
      Расход вырос на четверть, а <em>квалифицированных лидов</em> стало меньше
    </h1>
    <div class="report__stats">
      <div class="report__stat">
        <span class="report__stat-value">512&nbsp;600&nbsp;₽</span>
        <span class="report__stat-label">Расход</span>
      </div>
      <div class="report__stat">
        <span class="report__stat-value report__stat-value--accent">2&nbsp;507&nbsp;₽</span>
        <span class="report__stat-label">CPQL</span>
      </div>
    </div>
  </header>

  <div class="report__body">
    <aside class="report__sidebar">
      <div class="report__fact">
        <span class="report__fact-label">Период</span>
        <span class="report__fact-value">01–31.08.2026</span>
      </div>
      <div class="report__fact">
        <span class="report__fact-label">Источники</span>
        <div class="report__tags">
          <span class="report__tag">Директ</span>
          <span class="report__tag">Callibri</span>
        </div>
      </div>
    </aside>

    <div class="report__content">
      <section class="report__section">
        <span class="report__section-label">[ .Разрыв ]</span>
        <h2>Что именно сломалось</h2>
        <p class="report__text">Один абзац на мысль. Ширина ограничена 640px — не растягивай.</p>
      </section>
      <!-- остальные блоки -->
    </div>
  </div>

  <footer class="report__footer">
    <span class="report__footer-kicker">[ .Дальше ]</span>
    <h2 class="report__footer-title">Что делаем в сентябре</h2>
    <p class="report__footer-text">Одно-два предложения. Не вода.</p>
  </footer>
</main>
</body>
</html>
```

---

## Блоки

**Таблица.** Числовым колонкам ставь `class="num"` на `th` и `td` — это правое
выравнивание. Итоговая строка — в `<tfoot>`, она получит верхнюю границу
и полужирный. Одно значение в таблице можно выделить `report__table-highlight`,
больше одного — уже нельзя. Оборачивай таблицу в `<div class="report__table-wrap" tabindex="0" role="region"
aria-label="Таблица">` — без `tabindex` её нельзя прокрутить с клавиатуры.

**Сравнение «было / стало».** `report__compare` с двумя
`report__compare-item`, второй — с модификатором `--after`, он получает медную
рамку и подсветку. Только два столбца; для трёх и больше бери таблицу.

**Врезка.** `report__callout` — вывод, который нельзя пропустить. На отчёт
не больше двух.

**График.** `report__bars` — горизонтальные полосы на чистом CSS, ширина
задаётся инлайном: `<span class="report__bar-fill" style="width:72%"></span>`.
Медь — та серия, на которую нужно смотреть; остальные строки помечай
`report__bar--muted`. Если нужен настоящий график — рисуй инлайновый SVG
в тех же цветах, без библиотек. Порядок серий, когда их несколько:
`#B87333` → `#C9C3BB` → `#8A5637` → `#8C857D` → `#D0A984` → `#6B645B`.
Шестая серия раньше была `#5E574F` — 2,77:1, ниже порога 3:1 для
графических объектов; заменена на `#6B645B` (3,37:1).

**Код.** `report__code` — `<pre>` для разметки, конфига или команды. Прокручивается
вбок, поэтому ему нужен `tabindex="0"`, как таблице. Подсветки синтаксиса нет:
одно-два ключевых места выделяются `<b>` — это единственная медь внутри блока,
и больше двух выделений на листинг уже не читается. Подпись под блоком —
`report__code-caption`. Длинный листинг целиком в отчёт не кладут: это отчёт,
а не репозиторий — показывают фрагмент, который обсуждают.

**Нет данных.** `report__nodata` — блок с пунктирной рамкой на месте цифры,
которой нет. Пиши, чего именно не хватает и что оно бы показало:
«<b>Позиции и индексация</b> — нет доступа к Search Console; без них нельзя
сказать, сколько страниц реально в индексе». Это честнее пустого места
и полезнее выдуманного числа.

**Источники.** `report__sources` — список в конце: откуда взята каждая группа
цифр и когда снята. Для отчёта, где данные приходят из нескольких систем,
это важнее графика: через месяц никто не вспомнит, чей это CPL.

---

## Числа и текст

| Что | Как | Пример |
|---|---|---|
| Деньги | неразрывный пробел перед ₽ и в разрядах | `512 600 ₽` |
| Минус | символ U+2212, не дефис | `−1 240 ₽` |
| Проценты | запятая как разделитель дробной части | `3,4 %` |
| ROI | кратность | `3,54 ×` |
| Дельта | со знаком | `+12,4 %` |
| Диапазон дат | тире, не дефис | `01–31.08.2026` |

В HTML неразрывный пробел — `&nbsp;`. Числа в шапке отчёта обязательно
`white-space: nowrap` (уже в стилях), иначе знак валюты уезжает на свою строку.

Кавычки — «ёлочки», вложенные — „лапки“. Тире — длинное (—) с пробелами.
Буква «ё» пишется.

---

## Контрасты

| Пара | Контраст | Годится для |
|---|---|---|
| `--snow` на `--bg` | 16,4:1 | заголовки, крупные числа |
| `--text` на `--bg` | 11,9:1 | основной текст |
| `--accent` на `--bg` | 5,19:1 | акцентный текст, метки |
| `--border-control` на `--bg` | 3,25:1 | фокус и границы контролов |
| `--border` на `--bg` | 1,11:1 | **только** декоративные линии |

Текст с `opacity: 0.85` поверх `--text` — это 8,7:1, всё ещё норма.
Ниже 0.62 не опускай: 0.62 даёт 5,07:1, а 0.55 — уже 4,2:1, то есть ниже
порога AA для мелкого текста. Это посчитано, а не на глаз.

---

## Чеклист

- [ ] Один файл, открывается двойным кликом, без внешних скриптов
- [ ] Ни одного цвета вне списка токенов
- [ ] Медью выделено не больше двух-трёх вещей на экран
- [ ] Все метки в формате `[ .Название ]`
- [ ] Ни одна цифра не набрана Syne
- [ ] Аббревиатуры с цифрами обёрнуты в `.alnum`
- [ ] Числовые колонки выровнены вправо, всё числовое — `tabular-nums`
- [ ] ₽ и разряды с неразрывными пробелами, минус — U+2212
- [ ] ROI кратностью, не процентом
- [ ] Нет ни одного выдуманного числа
- [ ] На 390px нет горизонтальной прокрутки страницы
- [ ] Печать в PDF даёт светлую версию, а не чёрные заливки
- [ ] Прокручиваемая таблица имеет `tabindex="0"`
- [ ] Блок кода тоже имеет `tabindex="0"`
- [ ] Ни одна прозрачность текста не опущена ниже 0.62
- [ ] У каждой группы цифр в отчёте указан источник

/**
 * ABRA — тема для Google Таблиц.
 * Расширения → Apps Script → вставить этот файл → сохранить → перезагрузить
 * таблицу. В меню появится пункт «ABRA».
 *
 * Значения цветов — из sheets/TOKENS.md, который выведен из abra-tokens.css.
 * Sheets не понимает прозрачность, поэтому все rgba() уже сведены к
 * непрозрачным HEX по формуле: фон + (цвет − фон) × alpha.
 * Не подставлять сюда произвольные HEX — сначала токен, потом композитинг.
 */

var ABRA = {
  dark: {
    bg:          '#0C0B09',
    bgBand:      '#131210',
    bgHead:      '#131210',
    text:        '#CEC9C3',
    textStrong:  '#EDEBE6',
    textMuted:   '#84817C',
    accent:      '#B87333',
    accentText:  '#B87333',   // 5,19:1 на тёмном — можно текстом
    line:        '#1A1816',
    lineStrong:  '#63615D',
    fillAccent:  '#2B1E11',
    fillOk:      '#20251B',
    fillWarn:    '#2E2615',
    fillBad:     '#2A1813'
  },
  light: {
    bg:          '#EFEAE2',
    bgBand:      '#E9E4DC',
    bgHead:      '#E9E4DC',
    text:        '#1A1512',
    textStrong:  '#1A1512',
    textMuted:   '#6B6661',
    accent:      '#B87333',
    accentText:  '#8A5637',   // медь на бумаге даёт 3,17:1 — текстом только dim
    line:        '#DAD5CD',
    lineStrong:  '#848078',
    fillAccent:  '#E5D5C2',
    fillOk:      '#DADCCD',
    fillWarn:    '#E8DDC7',
    fillBad:     '#E5CFC5'
  },
  fontDisplay: 'Syne',   // только буквенные заголовки, НИКОГДА не цифры
  fontBody:    'Inter',
  rowHeight:     28,
  headRowHeight: 34,
  gutterWidth:   32
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ABRA')
    .addItem('Применить тёмную тему', 'applyDark')
    .addItem('Применить светлую тему (печать)', 'applyLight')
    .addSeparator()
    .addItem('Деньги, ₽', 'formatMoney')
    .addItem('Проценты', 'formatPercent')
    .addItem('ROI, кратность', 'formatRoi')
    .addItem('Штуки', 'formatCount')
    .addSeparator()
    .addItem('Подсветить выделенное акцентом', 'highlightAccent')
    .addToUi();
}

function applyDark()  { applyTheme(ABRA.dark);  }
function applyLight() { applyTheme(ABRA.light); }

/**
 * Красит активный лист целиком. Строка 1 считается шапкой,
 * колонка A — отступом (эквивалент --gutter сайта).
 */
function applyTheme(t) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rows = Math.max(sheet.getMaxRows(), 2);
  var cols = Math.max(sheet.getMaxColumns(), 2);

  // Сетки на сайте нет — только горизонтальные разделители.
  sheet.setHiddenGridlines(true);

  var all = sheet.getRange(1, 1, rows, cols);
  all.setBackground(t.bg)
     .setFontColor(t.text)
     .setFontFamily(ABRA.fontBody)
     .setFontSize(10)
     .setVerticalAlignment('middle');
  all.setBorder(false, false, false, false, false, false);

  // Колонка-отступ.
  sheet.setColumnWidth(1, ABRA.gutterWidth);

  // Полосатость: разница между bg и bgBand намеренно почти незаметна.
  clearBandings(sheet);
  var body = sheet.getRange(1, 2, rows, cols - 1);
  var banding = body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  banding.setHeaderRowColor(t.bgHead)
         .setFirstRowColor(t.bg)
         .setSecondRowColor(t.bgBand)
         .setFooterRowColor(null);

  // Шапка: Syne, верхний регистр, медная линия снизу.
  var head = sheet.getRange(1, 2, 1, cols - 1);
  head.setFontFamily(ABRA.fontDisplay)
      .setFontWeight('bold')
      .setFontColor(t.textStrong)
      .setVerticalAlignment('middle')
      .setWrap(true);
  head.setBorder(null, null, true, null, null, null,
                 t.accent, SpreadsheetApp.BorderStyle.SOLID);

  // Тонкие разделители строк данных.
  if (rows > 1) {
    sheet.getRange(2, 2, rows - 1, cols - 1)
         .setBorder(null, null, true, null, null, null,
                    t.line, SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.setRowHeight(1, ABRA.headRowHeight);
  if (rows > 1) sheet.setRowHeights(2, rows - 1, ABRA.rowHeight);
  sheet.setFrozenRows(1);

  // Локаль — иначе не будет ни запятой в дробях, ни пробела в разрядах.
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetLocale('ru_RU');
}

function clearBandings(sheet) {
  var bandings = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).getBandings();
  for (var i = 0; i < bandings.length; i++) bandings[i].remove();
}

/* ---- Числовые форматы ---------------------------------------------------
   Цифры всегда Inter и всегда по правому краю: у Syne разновысокие 5 и 0,
   а знак ₽ съезжает с базовой линии. ---------------------------------- */

function formatMoney()   { applyNumberFormat('#,##0" ₽";−#,##0" ₽"'); }
function formatPercent() { applyNumberFormat('0.0"%"'); }
function formatCount()   { applyNumberFormat('#,##0'); }

/** ROI — кратность («3,54 ×»), не процент: формула отвечает «во сколько раз».
 *  Нужен процент — это уже ROMI = (прибыль − затраты) / затраты, и метрику
 *  надо переименовать. Смешивать нельзя. */
function formatRoi()     { applyNumberFormat('0.00" ×"'); }

function applyNumberFormat(format) {
  SpreadsheetApp.getActiveRange()
    .setNumberFormat(format)
    .setFontFamily(ABRA.fontBody)
    .setHorizontalAlignment('right');
}

/** Один акцент на экран: если медью подсвечено больше 2–3 ячеек,
 *  подсветка перестала что-либо значить. */
function highlightAccent() {
  var t = isLightSheet() ? ABRA.light : ABRA.dark;
  SpreadsheetApp.getActiveRange()
    .setBackground(t.fillAccent)
    .setFontColor(t.textStrong)
    .setFontWeight('bold');
}

function isLightSheet() {
  var bg = SpreadsheetApp.getActiveSheet().getRange('B2').getBackground();
  return bg === ABRA.light.bg || bg === ABRA.light.bgBand;
}

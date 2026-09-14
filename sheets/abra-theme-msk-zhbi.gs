/**
 * ABRA — тема для таблицы «МСК ЖБИ — единый реестр сделок и обращений».
 *
 * Структура вкладок определяется автоматически: заголовок, описание, шапка
 * и блоки данных распознаются по содержимому, а не по номерам строк. У пяти
 * вкладок этой таблицы разметка разная (во «Владках» со «Справочниками» нет
 * строки описания, в «Сводке» два блока с разными шапками), поэтому жёстко
 * зашивать номера строк нельзя.
 *
 * УСТАНОВКА
 *   1. Открой таблицу → Расширения → Apps Script
 *   2. Удали содержимое Code.gs, вставь этот файл, сохрани (Ctrl/Cmd+S)
 *   3. Перезагрузи вкладку с таблицей — в меню появится «ABRA»
 *   4. Первый запуск попросит авторизацию: «Проверить разрешения» →
 *      выбрать аккаунт → «Дополнительные настройки» → «Перейти к проекту».
 *      Скрипт просит только доступ к текущей таблице.
 *
 * ПЕРЕД ПЕРВЫМ ЗАПУСКОМ сделай Файл → Создать копию. Скрипт меняет только
 * оформление, но таблица рабочая. Откатиться можно и через Файл → История
 * версий — Google хранит все состояния.
 *
 * ЧТО СКРИПТ НЕ ТРОГАЕТ: значения ячеек, формулы, гиперссылки, проверку
 * данных (выпадающие списки из «Справочников»), объединения, порядок строк,
 * ширину колонок.
 */

/* ───────────────────────── Палитра ─────────────────────────
   Значения — из дизайн-системы сайта a-bra.ru, сведённые к непрозрачным
   HEX по формуле: фон + (цвет − фон) × alpha. Новых цветов нет. */

var THEMES = {
  dark: {
    name:       'тёмная',
    bg:         '#0C0B09',
    bgBand:     '#131210',
    bgHead:     '#131210',
    text:       '#CEC9C3',
    textStrong: '#EDEBE6',
    textMuted:  '#84817C',
    accent:     '#B87333',  // 5,19:1 на тёмном — можно текстом
    line:       '#1A1816',
    lineStrong: '#63615D',
    fillInfo:   '#1E2124',  // бывшие ГОЛУБЫЕ поля — факты из выгрузок
    fillWarn:   '#2E2615',  // бывшие ЖЁЛТЫЕ поля — заполняет менеджер
    fillBad:    '#2A1813'   // бывшие КРАСНЫЕ поля — проблема
  },
  light: {
    name:       'светлая',
    bg:         '#EFEAE2',
    bgBand:     '#E9E4DC',
    bgHead:     '#E9E4DC',
    text:       '#1A1512',
    textStrong: '#1A1512',
    textMuted:  '#6B6661',
    accent:     '#8A5637',  // медь на бумаге даёт 3,17:1, текстом только dim
    line:       '#DAD5CD',
    lineStrong: '#848078',
    fillInfo:   '#D8D8D6',
    fillWarn:   '#E8DDC7',
    fillBad:    '#E5CFC5'
  }
};

var FONT_DISPLAY = 'Syne';   // только буквенные заголовки, НИКОГДА не цифры
var FONT_BODY    = 'Inter';
var ROW_H        = 28;       // высота строки данных
var ROW_H_HEAD   = 34;       // высота строки шапки
var ROW_H_TITLE  = 44;       // высота строки заголовка вкладки

/* Все цвета обеих тем — чтобы повторный запуск не принял уже покрашенную
   ячейку за исходную голубую или жёлтую. */
var KNOWN = (function () {
  var set = {};
  ['dark', 'light'].forEach(function (k) {
    var t = THEMES[k];
    [t.bg, t.bgBand, t.bgHead, t.fillInfo, t.fillWarn, t.fillBad].forEach(function (c) {
      set[c.toLowerCase()] = true;
    });
  });
  return set;
})();

/* ───────────────────────── Меню ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ABRA')
    .addItem('Тёмная тема — активный лист', 'darkActive')
    .addItem('Тёмная тема — все листы', 'darkAll')
    .addSeparator()
    .addItem('Светлая тема (печать) — активный лист', 'lightActive')
    .addItem('Светлая тема (печать) — все листы', 'lightAll')
    .addSeparator()
    .addItem('Снять старое условное форматирование', 'clearConditional')
    .addItem('Нейтральный вид (снять оформление)', 'resetPlain')
    .addToUi();
}

function darkActive()  { runOn([SpreadsheetApp.getActiveSheet()], THEMES.dark);  }
function lightActive() { runOn([SpreadsheetApp.getActiveSheet()], THEMES.light); }
function darkAll()     { runOn(SpreadsheetApp.getActiveSpreadsheet().getSheets(), THEMES.dark);  }
function lightAll()    { runOn(SpreadsheetApp.getActiveSpreadsheet().getSheets(), THEMES.light); }

function runOn(sheets, theme) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetLocale('ru_RU');
  var done = [], failed = [];
  sheets.forEach(function (sheet) {
    try {
      styleSheet(sheet, theme);
      SpreadsheetApp.flush();          // фиксируем лист сразу, а не в конце
      done.push(sheet.getName());
    } catch (e) {
      failed.push(sheet.getName() + ' (' + e.message + ')');
      console.log('Лист «' + sheet.getName() + '» не оформлен: ' + e.stack);
    }
  });
  SpreadsheetApp.getActive().toast(
    failed.length ? 'Готово: ' + done.join(', ') + '. Не вышло: ' + failed.join('; ')
                  : done.join(', '),
    'Применена ' + theme.name + ' тема', 8);
}

/* ───────────────────────── Основная логика ───────────────────────── */

function styleSheet(sheet, t) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;

  var all = sheet.getRange(1, 1, lastRow, lastCol);
  var values = all.getDisplayValues();
  var oldBg  = all.getBackgrounds();

  var rowKind = classifyRows(values);   // 'title' | 'desc' | 'head' | 'empty' | 'data'

  sheet.setHiddenGridlines(true);
  all.setBorder(false, false, false, false, false, false);   // 6 аргументов — сброс

  var bg = [], fc = [], ff = [], fs = [], fw = [];
  var dataSeq = 0;

  for (var r = 0; r < lastRow; r++) {
    var kind = rowKind[r];
    var bgRow = [], fcRow = [], ffRow = [], fsRow = [], fwRow = [];
    var band = null;

    if (kind === 'data') {
      band = (dataSeq % 2 === 1) ? t.bgBand : t.bg;
      dataSeq++;
    } else if (kind === 'head') {
      dataSeq = 0;                      // новый блок — полосатость с начала
    }

    for (var c = 0; c < lastCol; c++) {
      if (kind === 'head') {
        bgRow.push(t.bgHead);  fcRow.push(t.textStrong);
        ffRow.push(FONT_DISPLAY); fsRow.push(10); fwRow.push('bold');
      } else if (kind === 'title') {
        bgRow.push(t.bg); fcRow.push(t.textStrong);
        ffRow.push(FONT_DISPLAY); fsRow.push(18); fwRow.push('bold');
      } else if (kind === 'desc') {
        bgRow.push(t.bg); fcRow.push(t.textMuted);
        ffRow.push(FONT_BODY); fsRow.push(10); fwRow.push('normal');
      } else if (kind === 'empty') {
        bgRow.push(t.bg); fcRow.push(t.text);
        ffRow.push(FONT_BODY); fsRow.push(10); fwRow.push('normal');
      } else {
        // Строка данных: сохраняем смысл исходной заливки.
        var role = classifyFill(oldBg[r][c]);
        bgRow.push(role === 'info' ? t.fillInfo
                 : role === 'warn' ? t.fillWarn
                 : role === 'bad'  ? t.fillBad
                 : band);
        fcRow.push(t.text);
        ffRow.push(FONT_BODY); fsRow.push(10); fwRow.push('normal');
      }
    }
    bg.push(bgRow); fc.push(fcRow); ff.push(ffRow); fs.push(fsRow); fw.push(fwRow);
  }

  all.setBackgrounds(bg).setFontColors(fc).setFontFamilies(ff)
     .setFontSizes(fs).setFontWeights(fw)
     .setVerticalAlignment('middle');

  /* Перенос текста и высоты строк зависят от того, что за вкладка.
     Широкий реестр: перенос выключен, иначе «Запрос / суть» растянет строку
     на пол-экрана; высота фиксированная.
     Узкая вкладка («Сводка», «Справочники»): там в ячейках пояснения на две
     строки, и обрезка их просто спрячет — поэтому перенос включён, а высота
     подбирается под содержимое. Читаемость важнее ровного ритма строк. */
  var narrow = lastCol <= 8;

  sheet.getRange(1, 1, lastRow, lastCol).setWrapStrategy(
    narrow ? SpreadsheetApp.WrapStrategy.WRAP
           : SpreadsheetApp.WrapStrategy.CLIP);
  rowKind.forEach(function (k, i) {
    if (k === 'desc' || k === 'head') {
      sheet.getRange(i + 1, 1, 1, lastCol)
           .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    }
  });

  if (narrow) {
    sheet.autoResizeRows(1, lastRow);
  } else {
    for (var i = 0; i < lastRow; i++) {
      if (rowKind[i] === 'data' || rowKind[i] === 'empty') {
        sheet.setRowHeight(i + 1, ROW_H);
      }
    }
  }
  // Заголовок и шапки держат свою высоту в обоих случаях.
  rowKind.forEach(function (k, i) {
    if (k === 'title') sheet.setRowHeight(i + 1, ROW_H_TITLE);
    if (k === 'head')  sheet.setRowHeight(i + 1, ROW_H_HEAD);
  });

  // Границы: тонкие горизонтальные внутри блоков данных, медная под шапкой.
  applyBorders(sheet, rowKind, lastCol, t);

  // Числовые форматы и выравнивание — по названиям колонок каждого блока.
  applyFormats(sheet, values, rowKind, lastCol, t);

  // Закрепляем шапку первого блока и колонку-ключ.
  var firstHead = rowKind.indexOf('head');
  safeFreeze(sheet, firstHead >= 0 ? firstHead + 1 : 0, lastCol > 8 ? 1 : 0);
}

/**
 * Закрепление падает, если граница режет объединённую ячейку: на «Сводке»
 * заголовок объединён на A1:D1, и setFrozenColumns(1) выбрасывает
 * «Невозможно закрепить столбцы, в которых содержится только часть
 * объединённого диапазона». Это не повод ронять всё оформление листа —
 * пропускаем закрепление и пишем причину в журнал.
 */
function safeFreeze(sheet, rows, cols) {
  try {
    sheet.setFrozenRows(rows);
  } catch (e) {
    console.log('Лист «' + sheet.getName() + '»: строки не закреплены — ' + e.message);
  }
  if (cols > 0) {
    try {
      sheet.setFrozenColumns(cols);
    } catch (e) {
      console.log('Лист «' + sheet.getName() + '»: столбцы не закреплены — ' + e.message);
    }
  }
}

/**
 * Распознаёт роль каждой строки по содержимому.
 *
 * Шапка — непустая строка, перед которой пустая (или самая первая), больше
 * одной заполненной ячейки и ни одного числа. Так ловится и основная шапка,
 * и второй заголовок «Кампания Директа» посреди «Сводки».
 *
 * Всё, что стоит ДО первой шапки, — заголовок вкладки и описание. Номера
 * строк не зашиты специально: в «Справочниках» описания нет вовсе, и любая
 * привязка к строке 2 или 3 разъезжается.
 */
function classifyRows(values) {
  var kinds = [];

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var filled = row.filter(function (v) { return String(v).trim() !== ''; });
    if (filled.length === 0) { kinds.push('empty'); continue; }

    var prevEmpty = (r === 0) || kinds[r - 1] === 'empty';
    var hasNumber = row.some(function (v) {
      var t = String(v).trim().replace(/[\s\u00A0]/g, '').replace(',', '.');
      return t !== '' && isFinite(t);
    });
    // Объединённый заголовок вкладки отдаёт значение только в первой ячейке,
    // поэтому условие filled.length > 1 отсекает его от настоящих шапок.
    kinds.push(prevEmpty && !hasNumber && filled.length > 1 ? 'head' : 'data');
  }

  var firstHead = kinds.indexOf('head');
  var limit = firstHead < 0 ? kinds.length : firstHead;
  var seenTitle = false;
  for (var i = 0; i < limit; i++) {
    if (kinds[i] === 'empty') continue;
    kinds[i] = seenTitle ? 'desc' : 'title';
    seenTitle = true;
  }
  return kinds;
}

/**
 * Голубая заливка → факт из выгрузки, жёлтая → заполняет менеджер.
 * Это единственная смысловая информация, закодированная цветом в исходной
 * таблице, и потерять её нельзя.
 *
 * Различаем по каналам: у голубого синий выше красного. Жёлтый и красный оба
 * дают красный выше синего, и отличаются зелёным: у жёлтого он близок к
 * красному, у красного проваливается до уровня синего. Без этой проверки
 * красная заливка молча превращалась бы в «заполни руками».
 */
function classifyFill(hex) {
  if (!hex) return null;
  var h = String(hex).toLowerCase();
  if (h === THEMES.dark.fillInfo.toLowerCase() ||
      h === THEMES.light.fillInfo.toLowerCase()) return 'info';
  if (h === THEMES.dark.fillWarn.toLowerCase() ||
      h === THEMES.light.fillWarn.toLowerCase()) return 'warn';
  if (h === THEMES.dark.fillBad.toLowerCase() ||
      h === THEMES.light.fillBad.toLowerCase()) return 'bad';
  if (KNOWN[h] || h === '#ffffff' || h.length !== 7) return null;

  var r = parseInt(h.substr(1, 2), 16);
  var g = parseInt(h.substr(3, 2), 16);
  var b = parseInt(h.substr(5, 2), 16);
  if (b - r > 10) return 'info';
  if (r - b > 10) return (g - b > 12) ? 'warn' : 'bad';
  return null;
}

function applyBorders(sheet, rowKind, lastCol, t) {
  var start = -1;
  for (var r = 0; r <= rowKind.length; r++) {
    var isData = rowKind[r] === 'data';
    if (isData && start < 0) start = r;
    if (!isData && start >= 0) {
      sheet.getRange(start + 1, 1, r - start, lastCol)
           .setBorder(null, null, null, null, null, true,
                      t.line, SpreadsheetApp.BorderStyle.SOLID);
      start = -1;
    }
    if (rowKind[r] === 'head') {
      sheet.getRange(r + 1, 1, 1, lastCol)
           .setBorder(null, null, true, null, null, null,
                      t.accent, SpreadsheetApp.BorderStyle.SOLID);
    }
  }
}

/**
 * Формат колонки выводится из её заголовка. Трогаем только те колонки,
 * которые уверенно опознаны, — остальные остаются как есть.
 */
function applyFormats(sheet, values, rowKind, lastCol, t) {
  for (var r = 0; r < rowKind.length; r++) {
    if (rowKind[r] !== 'head') continue;

    var end = r + 1;
    while (end < rowKind.length && rowKind[end] === 'data') end++;
    var n = end - (r + 1);
    if (n < 1) continue;

    for (var c = 0; c < lastCol; c++) {
      var head = String(values[r][c] || '').trim();
      if (!head) continue;
      var range = sheet.getRange(r + 2, c + 1, n, 1);

      if (/₽/.test(head)) {
        range.setNumberFormat('#,##0" ₽";−#,##0" ₽"').setHorizontalAlignment('right');
      } else if (/^Дата/i.test(head)) {
        range.setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('right');
      } else if (/^(Событий|Клики|Конверсии|Значение|№)/i.test(head)) {
        range.setNumberFormat('#,##0').setHorizontalAlignment('right');
      } else if (/^(Ключ записи|Ключ события|ID сделки|Ссылка)/i.test(head)) {
        range.setFontColor(t.accent).setHorizontalAlignment('left');
      } else {
        range.setHorizontalAlignment('left');
      }
    }
  }
}

/* ───────────────────────── Служебное ───────────────────────── */

/** Старые правила условного форматирования красят ячейки поверх темы.
 *  Снимается отдельным пунктом меню — это осознанное решение, а не побочный
 *  эффект применения стиля. */
function clearConditional() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var n = sheet.getConditionalFormatRules().length;
  sheet.setConditionalFormatRules([]);
  SpreadsheetApp.getActive().toast(
    'Удалено правил: ' + n, sheet.getName(), 5);
}

/** Нейтральный вид. Исходные голубые и жёлтые заливки НЕ восстанавливает —
 *  для этого Файл → История версий. */
function resetPlain() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;
  sheet.setHiddenGridlines(false);
  var all = sheet.getRange(1, 1, lastRow, lastCol);
  all.setBackground('#FFFFFF').setFontColor('#000000')
     .setFontFamily('Arial').setFontSize(10).setFontWeight('normal');
  all.setBorder(false, false, false, false, false, false);
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
}

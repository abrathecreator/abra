#!/usr/bin/env node
/**
 * ABRA — проверка цветокоррекции фотографии.
 *
 * Считает те же метрики, что сняты с эталонов сайта (portrait.webp и
 * philosophy-portrait.webp), и сравнивает с допусками. Зависимостей нет.
 *
 *   sips -s format png фото.jpg --out /tmp/p.png
 *   node check-grade.mjs /tmp/p.png studio
 *
 * Расширение .mjs намеренное: так файл остаётся ES-модулем и внутри проекта
 * с "type":"module", и сам по себе в любой папке.
 *
 * Второй аргумент: studio — аватарки, обложки, фактуры (регистры A, B, D);
 *                  life   — живые фото в ленте (регистр C).
 */

import fs from 'node:fs';
import zlib from 'node:zlib';

/* Допуски. Центр каждого диапазона — значение эталона. */
const PROFILES = {
  studio: {
    title: 'студийный (аватарка, обложка, фактура)',
    checks: [
      ['доля почти-чёрного, %',   'darkShare', 70,   92],
      ['медиана яркости',         'medianLum',  1,   18],
      ['пересветы, %',            'clipped',    0, 0.05],
      ['оттенок, 10-й процентиль','hueP10',    18,   32],
      ['оттенок, 90-й процентиль','hueP90',    20,   36],
      ['насыщенность, медиана',   'satMedian', 0.45, 0.75]
    ]
  },
  life: {
    title: 'бытовой (живое фото в ленте)',
    checks: [
      ['доля почти-чёрного, %',   'darkShare',  8,   28],
      ['пересветы, %',            'clipped',    0,  0.1],
      ['оттенок, медиана',        'hueMedian', 28,   46],
      ['оттенок, 90-й процентиль','hueP90',    30,   52],
      ['насыщенность, медиана',   'satMedian', 0.18, 0.34]
    ]
  }
};

function decodePng(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('это не PNG. Сконвертируй: sips -s format png ...');
  let p = 8, w, h, depth, ct;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const data = b.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || (ct !== 2 && ct !== 6)) {
    throw new Error('поддерживается только 8 бит RGB/RGBA. Пересохрани: sips -s format png ...');
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.slice(q, q + stride); q += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const bb = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += bb;
      else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pp = a + bb - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cur[x] = v & 255;
    }
  }
  const px = [];
  for (let i = 0; i < w * h; i++) px.push([out[i * bpp], out[i * bpp + 1], out[i * bpp + 2]]);
  return { w, h, px };
}

const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function hsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) {
    if (mx === r) hh = ((g - b) / d + 6) % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
  }
  return [hh, mx ? d / mx : 0];
}

function measure(px) {
  const L = px.map(lum).sort((a, b) => a - b);
  const n = L.length;
  const at = q => L[Math.min(n - 1, Math.floor(n * q))];
  /* Тон и насыщенность считаем только по различимым пикселям: в чёрном
     оттенок — шум округления, он утянул бы медиану куда угодно. */
  const vis = px.filter(c => Math.max(...c) > 40).map(hsv);
  const hu = vis.map(v => v[0]).sort((a, b) => a - b);
  const sa = vis.map(v => v[1]).sort((a, b) => a - b);
  const m = vis.length;
  const hAt = q => (m ? hu[Math.min(m - 1, Math.floor(m * q))] : 0);
  const sAt = q => (m ? sa[Math.min(m - 1, Math.floor(m * q))] : 0);
  return {
    darkShare: L.filter(v => v < 20).length / n * 100,
    medianLum: at(0.5),
    clipped:   L.filter(v => v > 245).length / n * 100,
    hueP10:    hAt(0.1),
    hueMedian: hAt(0.5),
    hueP90:    hAt(0.9),
    satMedian: sAt(0.5),
    visible:   m / n * 100
  };
}

const [file, profileName = 'studio'] = process.argv.slice(2);
if (!file) {
  console.error('Использование: node check-grade.mjs <файл.png> [studio|life]');
  process.exit(2);
}
const profile = PROFILES[profileName];
if (!profile) {
  console.error('Неизвестный регистр «' + profileName + '». Доступны: studio, life');
  process.exit(2);
}

const { w, h, px } = decodePng(file);
const m = measure(px);

console.log('\n' + file.split('/').pop() + '  ' + w + '×' + h);
console.log('регистр: ' + profile.title + '\n');

let bad = 0;
for (const [label, key, lo, hi] of profile.checks) {
  const v = m[key];
  const ok = v >= lo && v <= hi;
  if (!ok) bad++;
  const shown = Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(0);
  console.log(
    (ok ? '  ok   ' : '  МИМО ') +
    label.padEnd(26) + shown.padStart(7) +
    '   норма ' + lo + '…' + hi
  );
}
console.log('\n  различимых пикселей: ' + m.visible.toFixed(0) + '%');
console.log(bad ? '\nПромахов: ' + bad + '\n' : '\nВ стиле.\n');
process.exit(bad ? 1 : 0);

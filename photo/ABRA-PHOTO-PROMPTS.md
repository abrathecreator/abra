# ABRA — промпты для обработки фотографий

Набор промптов, чтобы фотографии для соцсетей и аватарок попадали в стиль
сайта **a-bra.ru**. Файл самодостаточный: числа, промпты и способ проверки
внутри. Можно передать целиком в любой чат.

Промпты написаны по-английски: модели заметно точнее понимают световую
терминологию (`rim light`, `falloff`, `hue sector`) на английском. Вставлять
как есть, объяснения вокруг — для человека, не для модели.

---

## Откуда взяты значения

Не придуманы. Измерены с двух настоящих фотографий сайта — `portrait.webp`
(герой главной) и `philosophy-portrait.webp`. Отсюда два регистра.

### Регистр 1 — студийный. Аватарки, обложки, всё парадное

| Параметр | Значение в эталоне |
|---|---|
| Фон | `#000000` — чернее, чем фон сайта `#0C0B09` |
| Доля кадра почти-чёрного (L<20) | **86 %** |
| Медиана яркости | 3,3 из 255 |
| Пересветов (L>245) | **0,001 %** — 13 пикселей из 1,6 млн |
| Контровой свет | `#D1976B`, оттенок 26° |
| Кожа, средние тона | `#8B5A38`, оттенок 24° |
| Тени | `#140C06`, оттенок 28° — **тёплые, не синие** |
| Разброс оттенка по кадру | 22°…27° |
| Насыщенность, медиана | 0,60 |
| Различимых пикселей (не чёрных) | 13 % |

**Главное в этом стиле — не цвет, а его отсутствие.** Весь кадр укладывается
в сектор шириной три градуса: меняется только яркость. Медный акцент сайта
`#B87333` — это 29°, то есть портрет и интерфейс лежат в одном секторе.
Любой второй оттенок — синий отблеск, зелёный подтон кожи, серый холодный
фон — разрушает стиль сильнее, чем неудачная поза.

Второе по важности — **света не выбиты**. Пересвеченных пикселей 13 штук на
полтора миллиона: контровой свет яркий, но в белое не уходит. И третье —
различимо всего 13 % кадра. Остальное чернота, и это не недосвет, а приём.

### Регистр 2 — бытовой. Живые фото в ленте

| Параметр | Значение в эталоне |
|---|---|
| Насыщенность, медиана | 0,26 |
| Оттенок | 30°…42°, медиана 34° |
| Почти-чёрного | 17 % |
| Пересветов | 0,04 % |
| Средние тона | `#81725F`, оттенок 34° |

Тот же тёплый сектор, но мягче: приглушённый тёплый нейтрал, естественный
свет, низкая насыщенность. Не студия — просто снято и приведено к палитре.

---

## Ядро стиля

Этот абзац — общая часть. Он входит во все промпты ниже; отдельно его
вставлять не нужно.

```
COLOR GRADE — non-negotiable:
Single warm hue family only. Every visible pixel must sit between 20° and 32°
on the hue wheel (amber / copper). No second hue anywhere: no blue or cyan in
the shadows, no green skin undertone, no magenta, no teal-and-orange split
toning. Shadows are WARM (around #140C06), never neutral grey, never blue.
Blacks stay crushed and true black — do not lift, fade or add a matte film
look. Highlights must not clip: essentially zero blown pixels — under 0.01%
of the frame. Keep natural skin texture and film-level grain; do not smooth.
```

---

## A. Аватарка из существующего фото

Основной сценарий. Для ChatGPT, Gemini / Nano Banana, любого редактора
«картинка → картинка». Лицо не трогаем, меняем только свет и цвет.

```
Re-grade and re-light this photograph. Keep the person's face, features,
proportions, age, skin texture, hair and glasses EXACTLY as they are — this
is a real person, not a character. Do not retouch, slim, smooth, beautify or
alter identity in any way. Do not change the pose or crop the face.

Replace the background with pure near-black (#000000), seamless, no texture,
no gradient banding, no vignette drawn as an effect.

Lighting: one single warm copper rim light (#D1976B) from behind and slightly
above, raking along the hair line, cheekbone and jaw. No fill light on the
shadow side — let it fall to black. About 85% of the frame must read as
near-black. Skin mid-tones land around #8B5A38.

COLOR GRADE — non-negotiable:
Single warm hue family only. Every visible pixel must sit between 20° and 32°
on the hue wheel (amber / copper). No second hue anywhere: no blue or cyan in
the shadows, no green skin undertone, no magenta, no teal-and-orange split
toning. Shadows are WARM (around #140C06), never neutral grey, never blue.
Blacks stay crushed and true black — do not lift, fade or add a matte film
look. Highlights must not clip: essentially zero blown pixels — under 0.01%
of the frame. Keep natural skin texture and film-level grain; do not smooth.

Output: square 1:1, at least 1000×1000, subject centred, head occupying
roughly 60% of the frame height.
```

Если модель всё же «причёсывает» лицо, добавь в конец: `Treat this as a
colour-grading job only. The subject must remain recognisably the same person
to someone who knows them.`

---

## B. Обложка поста

Горизонталь под ссылки и превью. Слева намеренно пустой чёрный — туда ляжет
текст.

```
Re-grade and re-light this photograph as a wide cover image. Keep the person's
face, features, proportions and skin texture EXACTLY as they are. No
retouching, no beautification, no identity changes.

Composition: subject on the RIGHT third, in profile or three-quarter turn
looking out of frame. The left two thirds stay empty near-black (#000000) as
negative space for a headline. Edges fade into the black background with a
soft feathered falloff — no hard cut-out silhouette, no visible mask edge.

Lighting: one warm copper rim light (#D1976B) from behind the subject,
defining the hair and jaw line. No fill. Around 80% of the frame near-black.

COLOR GRADE — non-negotiable:
Single warm hue family only. Every visible pixel must sit between 20° and 32°
on the hue wheel (amber / copper). No second hue anywhere: no blue or cyan in
the shadows, no green skin undertone, no magenta, no teal-and-orange split
toning. Shadows are WARM (around #140C06), never neutral grey, never blue.
Blacks stay crushed and true black — do not lift, fade or add a matte film
look. Highlights must not clip: essentially zero blown pixels — under 0.01%
of the frame. Keep natural skin texture and film-level grain; do not smooth.

Output: 1200×630, no text, no logo, no watermark.
```

Текст на обложку накладывай отдельно — Syne для букв, Inter для цифр, цвета
`#EDEBE6` и `#B87333`. Моделью надписи не рисуй: она соврёт в кириллице.

---

## C. Живое фото в ленте

Для обычных кадров: рабочий стол, встреча, поездка. Здесь студийный контраст
неуместен — он превратит бытовую сцену в постановку.

```
Re-grade this photograph. Keep the scene, composition, people and objects
exactly as they are — this is a documentary correction, not a re-imagining.
Do not add or remove anything, do not change faces.

Target look: muted warm neutral. Pull overall saturation down to about 0.25
(medium-low). Push the whole frame into a warm hue sector of 30°-43° — the
same amber family as the rest of the brand. Natural available light, soft
falloff, no artificial rim light, no studio drama.

Remove every competing hue: no blue cast in shadows or windows, no green in
foliage or fluorescent light, no saturated brand colours in the scene — desaturate
them into the warm neutral. Whites go slightly warm, never blue.

Blacks stay honest: about 15-20% of the frame near-black, no lifted matte
shadows. Highlights not clipped. Keep grain and real texture.

Output: 4:5 vertical, at least 1200px on the short side.
```

---

## D. Кадр без лица

Фактура, предмет, рабочее место — когда нужен фон под текст или заставка.

```
Re-grade this photograph into a near-abstract brand texture. Near-black
background (#000000) occupying at least 85% of the frame. A single warm copper
light source (#D1976B) grazing across the subject at a shallow angle, revealing
material texture — metal, concrete, paper, glass — and falling off to pure black.

COLOR GRADE — non-negotiable:
Single warm hue family only. Every visible pixel must sit between 20° and 32°
on the hue wheel (amber / copper). No second hue anywhere: no blue or cyan in
the shadows, no green skin undertone, no magenta, no teal-and-orange split
toning. Shadows are WARM (around #140C06), never neutral grey, never blue.
Blacks stay crushed and true black — do not lift, fade or add a matte film
look. Highlights must not clip: essentially zero blown pixels — under 0.01%
of the frame. Keep natural skin texture and film-level grain; do not smooth.

No people, no text, no logos. Output: square 1:1, at least 1200×1200.
```

---

## Что запрещено

Вставляй списком, если модель упрямится. Для Midjourney — через `--no`.

```
blue shadows, cyan, teal and orange, split toning, green skin, magenta,
purple, neon, multiple light sources, lens flare, glow, bloom, halation,
HDR look, lifted matte blacks, faded film look, heavy vignette as an effect,
beauty retouching, skin smoothing, face slimming, airbrush, plastic skin,
blown highlights, clipped whites, oversaturation, text, watermark, logo
```

---

## Правила, которые важнее промпта

1. **Лицо не редактируется.** Это реальный человек и личный бренд. Обработка
   касается света и цвета, а не внешности. Если на выходе лицо «улучшено» —
   кадр брак, даже если красиво.
2. **Один источник света.** Два и больше — и кадр перестаёт быть узнаваемым:
   пропадает та самая чернота, на которой всё держится.
3. **Ни одного второго оттенка.** Это то же правило, что и в интерфейсе:
   новый цвет не вводится.
4. **Никаких надписей от модели.** Кириллицу генераторы пишут с ошибками.
   Текст — отдельным слоем, Syne для букв, Inter для цифр.
5. **Пересветов быть не должно.** В эталоне их ровно ноль.
6. Аватарку проверяй в размере 48×48 — в ленте её увидят такой. Если на
   мелком размере видно только чёрное пятно, света слишком мало.

---

## Размеры

| Площадка | Размер | Регистр |
|---|---|---|
| Аватарка | 1000×1000, показывается кругом | A |
| Пост в ленте | 1080×1350 (4:5) | C |
| Обложка ссылки, OG | 1200×630 | B |
| Telegram-превью | 1200×630 | B |
| Заставка, фон под текст | 1200×1200 | D |

Для аватарки держи запас по краям: сервисы обрезают в круг и срежут углы.

---

## Проверка результата

Глазами тёплый уход в сторону заметить трудно, поэтому рядом лежит
`check-grade.mjs` — считает те же метрики, что я снял с эталона. Зависимостей
нет, нужен только node.

```bash
sips -s format png фото.jpg --out /tmp/p.png && node check-grade.mjs /tmp/p.png studio
```

Второй аргумент — `studio` (регистр A, B, D) или `life` (регистр C).
Скрипт печатает измеренное против целевого и помечает промахи.

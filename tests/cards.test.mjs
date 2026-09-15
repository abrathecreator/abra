/* Карточки кейсов и статей: метки по углам вместо скруглённой рамки. */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { read } from "./helpers/pages.mjs";

const CORNERS = ["tl", "tr", "bl", "br"];

describe("карточки — разметка", () => {
  for (const file of ["cases.html", "articles.html"]) {
    test(`${file}: четыре метки внутри карточки`, () => {
      const card = read(file).match(/<a class="content-card"[\s\S]*?<\/a>/);
      assert.ok(card, "есть .content-card");
      for (const corner of CORNERS) {
        assert.match(
          card[0],
          new RegExp(`<span class="content-card__mark content-card__mark--${corner}" aria-hidden="true"></span>`)
        );
      }
    });
  }
});

describe("карточки — поведение", () => {
  let browser;
  let page;
  before(async () => {
    browser = await launch();
    page = await browser.newPage();
  });
  after(async () => {
    page?.close();
    await browser?.close();
  });

  const measure = `(() => {
    const card = document.querySelector(".content-card");
    const cs = getComputedStyle(card);
    const mark = (c) => card.querySelector(".content-card__mark--" + c);
    const tl = getComputedStyle(mark("tl"));
    return {
      cardWidth: card.getBoundingClientRect().width,
      cardHeight: card.getBoundingClientRect().height,
      border: cs.borderTopWidth,
      borderBottom: cs.borderBottomWidth,
      radius: cs.borderTopLeftRadius,
      transform: cs.transform,
      outline: cs.outlineStyle + " " + cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      width: parseFloat(tl.width),
      height: parseFloat(tl.height),
      opacity: tl.opacity,
      shift: tl.transform,
      gap: mark("tr").getBoundingClientRect().left - mark("tl").getBoundingClientRect().right,
      focused: document.activeElement === card,
    };
  })()`;

  test("в покое: без рамки и скругления, метки 18px и приглушены", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const m = await page.eval(measure);
    assert.equal(m.border, "0px");
    assert.equal(m.radius, "0px");
    assert.equal(m.width, 18);
    assert.equal(m.opacity, "0.6");
  });

  /* .legal a { border-bottom: 1px solid rgba(184,115,51,.35) } наследуется
     карточкой как обычной ссылкой внутри .legal — .legal .content-card
     должна перебивать это в покое и при наведении (когда .legal a:hover
     красит унаследованную рамку в акцентный). */
  test("рамка от .legal a не просачивается ни в покое, ни при наведении", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const rest = await page.eval(measure);
    assert.equal(rest.borderBottom, "0px");
    await page.hover(".content-card");
    await page.wait(300);
    const hovered = await page.eval(measure);
    assert.equal(hovered.borderBottom, "0px");
  });

  test("при наведении метки растут, но посередине остаётся просвет; подъёма нет", async () => {
    await page.goto("/cases.html", { width: 1440 });
    await page.hover(".content-card");
    await page.wait(300);
    const m = await page.eval(measure);
    assert.ok(Math.abs(m.width - (m.cardWidth / 2 - 28)) <= 1, `ширина метки ${m.width}`);
    assert.ok(Math.abs(m.height - (m.cardHeight / 2 - 20)) <= 1, `высота метки ${m.height}`);
    assert.equal(m.opacity, "1");
    assert.equal(m.shift, "matrix(1, 0, 0, 1, -4, -4)");
    assert.ok(m.gap >= 40, `просвет между метками ${m.gap}px`);
    assert.equal(m.transform, "none");
  });

  test("фокус с клавиатуры: метки растут и видна медная обводка", async () => {
    await page.goto("/cases.html", { width: 1440 });
    await page.eval("localStorage.setItem('abra-cookie-consent', '1')");
    await page.goto("/cases.html", { width: 1440 });
    let m;
    for (let i = 0; i < 20; i++) {
      await page.press("Tab");
      m = await page.eval(measure);
      if (m.focused) break;
    }
    assert.ok(m.focused, "карточка достижима с клавиатуры");
    await page.wait(700);
    m = await page.eval(measure);
    assert.equal(m.outline, "solid 1px");
    /* Метки при фокусе уходят наружу на 4px — обводка на 8px, иначе
       она сливается с ними в двойную линию и прячет просвет. */
    assert.equal(m.outlineOffset, "8px");
    assert.ok(m.width > 18);
  });
});

/* Вырезает из CSS все блоки @media (hover: hover) and (pointer: fine)
   с учётом вложенных скобок — то, что осталось, действует и на тач. */
function stripMouseOnlyBlocks(css) {
  const head = "@media (hover: hover) and (pointer: fine)";
  let out = "";
  let i = 0;
  for (;;) {
    const start = css.indexOf(head, i);
    if (start === -1) return out + css.slice(i);
    out += css.slice(i, start);
    let j = css.indexOf("{", start);
    let depth = 0;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
}

describe("карточки — наведение только для мыши", () => {
  test("все :hover карточки внутри @media (hover: hover) and (pointer: fine)", () => {
    const rest = stripMouseOnlyBlocks(read("src/style.css"));
    assert.ok(!rest.includes(".content-card:hover"), "на тач :hover может залипнуть после тапа");
  });
});

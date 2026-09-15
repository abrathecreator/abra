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
      radius: cs.borderTopLeftRadius,
      transform: cs.transform,
      outline: cs.outlineStyle + " " + cs.outlineWidth,
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
    assert.ok(m.width > 18);
  });
});

/* Базовая страховка всего плана: ни одна страница ни на одной ширине
   не шире экрана. Должен проходить до любых правок и после каждой. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, WIDTHS } from "./helpers/pages.mjs";

let browser;
let page;

before(async () => {
  browser = await launch();
  page = await browser.newPage();
});

after(async () => {
  page.close();
  await browser.close();
});

for (const { path } of PAGES) {
  test(`нет горизонтального переполнения: ${path}`, async () => {
    for (const width of WIDTHS) {
      await page.goto(path, { width, height: 800 });
      const { scroll, client } = await page.eval(
        "({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })"
      );
      assert.equal(scroll, client, `${path} на ${width}px: scrollWidth ${scroll} ≠ ${client}`);
    }
  });
}

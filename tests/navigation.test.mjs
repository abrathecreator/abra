/* Навигация: viewport и безопасная зона, шапка, нижняя панель, cookie,
   hero, шторка «Написать». */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, read } from "./helpers/pages.mjs";

/* Один браузер на describe: before/after внутри текущего блока. */
function withBrowser() {
  const ctx = {};
  before(async () => {
    ctx.browser = await launch();
    ctx.page = await ctx.browser.newPage();
  });
  after(async () => {
    ctx.page?.close();
    await ctx.browser?.close();
  });
  return ctx;
}

describe("viewport и безопасная зона", () => {
  for (const { file } of PAGES) {
    test(`${file}: viewport-fit=cover`, () => {
      assert.ok(
        read(file).includes(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />'
        )
      );
    });
  }

  test("токены --border-surface и --nav-h с безопасной зоной", () => {
    const css = read("src/style.css");
    assert.ok(css.includes("--border-surface: rgba(206, 201, 195, 0.16);"));
    assert.ok(css.includes("--nav-h: calc(84px + env(safe-area-inset-top));"));
  });

  describe("в браузере", () => {
    const ctx = withBrowser();

    test("на обычном экране отступы шапки и якорей не изменились", async () => {
      await ctx.page.goto("/", { width: 1440 });
      const got = await ctx.page.eval(`(() => {
        const nav = getComputedStyle(document.querySelector(".nav"));
        return {
          top: nav.paddingTop,
          left: nav.paddingLeft,
          margin: getComputedStyle(document.getElementById("insight")).scrollMarginTop,
        };
      })()`);
      assert.equal(got.top, "20px");
      assert.equal(got.left, "56px");
      assert.equal(got.margin, "100px");
    });
  });
});

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

const SECTION_INDEX = { home: 0, cases: 1, articles: 2 };
const NAV_LINKS = [
  ["%BASE_URL%", "Главная"],
  ["%BASE_URL%cases", "Кейсы"],
  ["%BASE_URL%articles", "Статьи"],
];

describe("шапка — три ссылки и текущий раздел", () => {
  for (const { file, section, current } of PAGES) {
    test(`${file}: разметка`, () => {
      const block = read(file).match(/<nav class="nav__links"[^>]*>([\s\S]*?)<\/nav>/);
      assert.ok(block, "есть .nav__links");
      const links = [...block[1].matchAll(/<a href="([^"]+)"(?: aria-current="([^"]+)")?>([^<]+)<\/a>/g)];
      assert.deepEqual(
        links.map((m) => [m[1], m[3]]),
        NAV_LINKS,
        "Главная · Кейсы · Статьи, без якорей"
      );
      links.forEach((m, i) => {
        const expected = section && SECTION_INDEX[section] === i ? current : undefined;
        assert.equal(m[2], expected, `aria-current у «${m[3]}»`);
      });
    });
  }

  describe("в браузере", () => {
    const ctx = withBrowser();
    for (const { path, section, current } of PAGES) {
      test(`${path}: текущий пункт подчёркнут`, async () => {
        await ctx.page.goto(path, { width: 1440 });
        const got = await ctx.page.eval(`(() => {
          const links = [...document.querySelectorAll(".nav__links a")];
          const cur = document.querySelector(".nav__links a[aria-current]");
          return {
            count: links.length,
            index: cur ? links.indexOf(cur) : -1,
            value: cur ? cur.getAttribute("aria-current") : null,
            line: cur ? getComputedStyle(cur, "::after").transform : null,
            color: cur ? getComputedStyle(cur).color : null,
          };
        })()`);
        assert.equal(got.count, 3);
        if (!section) {
          assert.equal(got.index, -1);
          return;
        }
        assert.equal(got.index, SECTION_INDEX[section]);
        assert.equal(got.value, current);
        assert.equal(got.line, "matrix(1, 0, 0, 1, 0, 0)");
        assert.equal(got.color, "rgb(184, 115, 51)");
      });
    }
  });
});

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

const TAB_LINKS = [
  ["%BASE_URL%", "Главная"],
  ["%BASE_URL%cases", "Кейсы"],
  ["%BASE_URL%articles", "Статьи"],
];

const tabbarBlock = (html) => {
  const m = html.match(/    <nav class="tabbar" aria-label="Разделы сайта">[\s\S]*?\n    <\/nav>/);
  return m ? m[0] : null;
};

describe("нижняя панель — разметка", () => {
  const reference = tabbarBlock(read("index.html"))?.replace(/ aria-current="[^"]*"/g, "");

  for (const { file, section, current } of PAGES) {
    test(`${file}: вкладки, «Написать», без гамбургера`, () => {
      const html = read(file);
      assert.ok(!html.includes("nav__menu-toggle"), "гамбургера нет");
      assert.ok(!html.includes('id="nav-links"'), "id от гамбургера убран");
      const block = tabbarBlock(html);
      assert.ok(block, "есть .tabbar сразу после шапки");
      assert.ok(html.indexOf("</header>") < html.indexOf('<nav class="tabbar"'));

      const tabs = [...block.matchAll(
        /<a class="tabbar__tab" href="([^"]+)"(?: aria-current="([^"]+)")?>[\s\S]*?<span class="tabbar__label">([^<]+)<\/span>/g
      )];
      assert.deepEqual(tabs.map((m) => [m[1], m[3]]), TAB_LINKS);
      tabs.forEach((m, i) => {
        const expected = section && SECTION_INDEX[section] === i ? current : undefined;
        assert.equal(m[2], expected, `aria-current у вкладки «${m[3]}»`);
      });
      assert.match(block, /<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact"/);
      assert.equal(block.replace(/ aria-current="[^"]*"/g, ""), reference, "панель совпадает с главной");
    });
  }

  test("гамбургер удалён из CSS и JS", () => {
    assert.ok(!read("src/style.css").includes("nav__menu-toggle"));
    assert.ok(!read("src/nav.js").includes("menu-toggle"));
  });
});

describe("нижняя панель — поведение", () => {
  const ctx = withBrowser();

  const state = `(() => {
    const bar = document.querySelector(".tabbar");
    const cs = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const cur = bar.querySelector("[aria-current]");
    return {
      display: cs.display,
      visibility: cs.visibility,
      hidden: bar.classList.contains("is-hidden"),
      suppressed: bar.classList.contains("is-suppressed"),
      bottom: Math.round(rect.bottom),
      current: cur ? cur.textContent.trim() : null,
      line: cur ? getComputedStyle(cur.querySelector(".tabbar__label"), "::after").transform : null,
      top: getComputedStyle(document.querySelector(".nav__links")).display,
      contact: getComputedStyle(document.querySelector(".nav__contact")).display,
      footer: getComputedStyle(document.querySelector(".footer")).paddingBottom,
    };
  })()`;

  test("на 390px: панель внизу, в шапке только логотип, текущая вкладка подчёркнута", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const s = await ctx.page.eval(state);
    assert.equal(s.display, "grid");
    assert.equal(s.bottom, 836);
    assert.equal(s.top, "none");
    assert.equal(s.contact, "none");
    assert.equal(s.current, "Кейсы");
    assert.equal(s.line, "matrix(1, 0, 0, 1, 0, 0)");
    assert.equal(s.footer, "114px");
  });

  test("на 1440px панели нет", async () => {
    await ctx.page.goto("/cases.html", { width: 1440 });
    assert.equal((await ctx.page.eval(state)).display, "none");
  });

  test("прячется при прокрутке вниз, возвращается вверх и у конца страницы", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await ctx.page.eval(`window.scrollTo({ top: 700, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, true, "вниз — спряталась");
    await ctx.page.eval(`window.scrollTo({ top: 400, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false, "вверх — вернулась");
    await ctx.page.eval(`window.scrollTo({ top: 900, behavior: "instant" })`);
    await ctx.page.wait(300);
    await ctx.page.eval(`window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false, "у конца страницы — видна");
  });

  test("при уменьшении движения не прячется", async () => {
    await ctx.page.goto("/", { width: 390, height: 844, reducedMotion: true });
    await ctx.page.eval(`window.scrollTo({ top: 700, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false);
  });

  test("скрыта, пока фокус в текстовом поле", async () => {
    await ctx.page.goto("/unit-economics.html", { width: 390, height: 844 });
    await ctx.page.eval(`document.getElementById("ue-impressions").focus()`);
    let s = await ctx.page.eval(state);
    assert.equal(s.suppressed, true);
    assert.equal(s.visibility, "hidden");
    await ctx.page.eval(`document.activeElement.blur()`);
    s = await ctx.page.eval(state);
    assert.equal(s.suppressed, false);
    assert.equal(s.visibility, "visible");
  });

  test("без JS «Написать» ведёт на форму главной", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844, js: false });
    const href = await ctx.page.eval(`document.querySelector(".tabbar__cta").getAttribute("href")`);
    assert.equal(href, "/#contact");
  });
});

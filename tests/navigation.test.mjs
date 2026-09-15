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

  test("у конца страницы возвращается и после сдвига короче 6px", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    const maxY = "document.documentElement.scrollHeight - innerHeight";
    await ctx.page.eval(`window.scrollTo({ top: ${maxY} - 5, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, true, "за 5px до конца — спряталась");
    await ctx.page.eval(`window.scrollTo({ top: ${maxY}, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, false, "в самом конце — видна");
  });

  test("спрятанная прокруткой панель видна, когда в неё приходит фокус с клавиатуры", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await ctx.page.eval(`window.scrollTo({ top: 700, behavior: "instant" })`);
    await ctx.page.wait(400);
    assert.equal((await ctx.page.eval(state)).hidden, true, "спряталась");
    await ctx.page.eval(`document.querySelector(".nav__logo").focus()`);
    await ctx.page.press("Tab");
    await ctx.page.wait(400); // 280мс transition панели + запас
    const r = await ctx.page.eval(`(() => {
      const tab = document.activeElement;
      const rect = tab.getBoundingClientRect();
      return {
        first: tab === document.querySelector(".tabbar__tab"),
        top: rect.top,
        bottom: rect.bottom,
        opacity: getComputedStyle(document.querySelector(".tabbar")).opacity,
        y: Math.round(scrollY),
      };
    })()`);
    assert.equal(r.first, true, "Tab от логотипа — первая вкладка");
    assert.equal(r.y, 700, "страница не прокручивалась — панель вернул фокус, а не прокрутка");
    assert.ok(r.top >= 0 && r.bottom <= 844, `вкладка ${r.top}–${r.bottom} вне экрана`);
    assert.equal(r.opacity, "1");
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

describe("телефон: cookie-карточка и hero над панелью", () => {
  const ctx = withBrowser();

  const rects = `(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
    };
    return {
      cookie: box("#cookie-banner"),
      bar: box(".tabbar"),
      cta: box(".hero .abra-cta"),
      radius: getComputedStyle(document.getElementById("cookie-banner")).borderRadius,
    };
  })()`;

  test("cookie-баннер — отдельная карточка над панелью", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    await ctx.page.eval("localStorage.clear()");
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const r = await ctx.page.eval(rects);
    assert.equal(r.cookie.left, 12);
    assert.equal(r.cookie.right, 378);
    assert.equal(r.radius, "18px");
    assert.ok(r.cookie.bottom <= r.bar.top - 6, `карточка до ${r.cookie.bottom}, панель с ${r.bar.top}`);
  });

  for (const [width, height] of [[390, 844]]) {
    test(`hero ${width}×${height}: «Разобрать систему» целиком над панелью`, async () => {
      await ctx.page.goto("/", { width, height });
      await ctx.page.wait(1800); // вступительная анимация hero
      const r = await ctx.page.eval(rects);
      assert.ok(r.cta.bottom <= r.bar.top - 12, `кнопка до ${r.cta.bottom}, панель с ${r.bar.top}`);
    });
  }

  // На 375×667 кнопка «Разобрать систему» физически ниже линии сгиба даже
  // без панели (портрет уже на полу 200px, .hero__title — двухстрочный
  // заголовок минимум 80px) — first-screen проверку заменили сценарием
  // реального посетителя: короткая прокрутка прячет панель, и кнопка
  // должна поместиться в видимую область уже без неё.
  test("hero 375×667: после короткой прокрутки панель уходит и «Разобрать систему» видна целиком", async () => {
    await ctx.page.goto("/", { width: 375, height: 667 });
    await ctx.page.wait(1800); // вступительная анимация hero
    await ctx.page.eval(`window.scrollTo({ top: 120, behavior: "instant" })`);
    await ctx.page.wait(400); // 280мс transition панели + запас — как в тесте автоскрытия выше
    const r = await ctx.page.eval(`(() => {
      const bar = document.querySelector(".tabbar");
      const cta = document.querySelector(".hero .abra-cta").getBoundingClientRect();
      return {
        hidden: bar.classList.contains("is-hidden"),
        cta: { top: Math.round(cta.top), bottom: Math.round(cta.bottom) },
        innerHeight: window.innerHeight,
      };
    })()`);
    assert.equal(r.hidden, true);
    assert.ok(r.cta.top >= 0, `кнопка выше экрана: top ${r.cta.top}`);
    assert.ok(
      r.cta.bottom <= r.innerHeight - 12,
      `кнопка до ${r.cta.bottom}, экран высотой ${r.innerHeight}`
    );
  });
});

const sheetBlock = (html) => {
  const m = html.match(/    <div class="sheet" id="contact-sheet" hidden>[\s\S]*?\n    <\/div>\n/);
  return m ? m[0] : null;
};
const normalizeSheet = (block) =>
  block.replace(/<(button|a) class="abra-cta"[^>]*>[\s\S]*?<\/\1>/, "@@APPLY@@");

describe("шторка — разметка", () => {
  const reference = normalizeSheet(sheetBlock(read("index.html")) ?? "");

  for (const { file, modal } of PAGES) {
    test(`${file}: шторка после панели, вариант «Оставить заявку»`, () => {
      const html = read(file);
      assert.equal(html.split('id="contact-sheet"').length - 1, 1);
      assert.match(
        html,
        /<a class="abra-cta tabbar__cta" href="%BASE_URL%#contact" data-sheet-open aria-haspopup="dialog" aria-controls="contact-sheet">/
      );
      const block = sheetBlock(html);
      assert.ok(block, "есть #contact-sheet");
      assert.ok(html.indexOf('<nav class="tabbar"') < html.indexOf('id="contact-sheet"'));
      if (modal) {
        assert.match(block, /<button class="abra-cta" type="button" data-sheet-apply/);
      } else {
        assert.match(block, /<a class="abra-cta" href="%BASE_URL%#contact">/);
        assert.ok(!block.includes("data-sheet-apply"));
      }
      assert.equal(normalizeSheet(block), reference, "шторка совпадает с главной");
    });
  }
});

describe("шторка — поведение", () => {
  const ctx = withBrowser();

  const state = `(() => {
    const sheet = document.getElementById("contact-sheet");
    const bar = document.querySelector(".tabbar");
    const modal = document.getElementById("contact-modal");
    const active = document.activeElement;
    return {
      sheetHidden: sheet.hidden,
      open: sheet.classList.contains("is-open"),
      focusOnPanel: active === sheet.querySelector(".sheet__panel"),
      focusInSheet: sheet.contains(active),
      focusOnOpener: active ? active.matches("[data-sheet-open]") : false,
      barSuppressed: bar.classList.contains("is-suppressed"),
      barVisibility: getComputedStyle(bar).visibility,
      overflow: document.body.style.overflow,
      modalHidden: modal ? modal.hidden : null,
    };
  })()`;

  const openSheet = async () => {
    await ctx.page.eval(`document.querySelector("[data-sheet-open]").click()`);
    await ctx.page.wait(400);
  };

  test("открывается: фокус на панели, панель навигации скрыта, прокрутка заблокирована", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, false);
    assert.equal(s.open, true);
    assert.equal(s.focusOnPanel, true);
    assert.equal(s.barSuppressed, true);
    assert.equal(s.barVisibility, "hidden");
    assert.equal(s.overflow, "hidden");
  });

  test("Tab не выходит из шторки", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    for (let i = 0; i < 8; i++) {
      await ctx.page.press("Tab");
      assert.equal((await ctx.page.eval(state)).focusInSheet, true, `Tab №${i + 1}`);
    }
  });

  test("Escape закрывает и возвращает фокус на «Написать»", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.press("Escape");
    await ctx.page.wait(450);
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, true);
    assert.equal(s.focusOnOpener, true);
    assert.equal(s.barSuppressed, false);
    assert.equal(s.overflow, "");
  });

  test("тап по затемнению закрывает", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(`document.querySelector(".sheet__scrim").click()`);
    await ctx.page.wait(450);
    assert.equal((await ctx.page.eval(state)).sheetHidden, true);
  });

  test("«Оставить заявку» открывает модалку, после неё фокус на «Написать»", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(`document.querySelector("[data-sheet-apply]").click()`);
    await ctx.page.wait(450);
    let s = await ctx.page.eval(state);
    assert.equal(s.modalHidden, false, "модалка открыта");
    assert.equal(s.sheetHidden, true, "шторка закрыта");
    assert.equal(s.barSuppressed, true, "панель скрыта под модалкой");
    await ctx.page.press("Escape");
    await ctx.page.wait(450);
    s = await ctx.page.eval(state);
    assert.equal(s.modalHidden, true);
    assert.equal(s.barSuppressed, false);
    assert.equal(s.focusOnOpener, true, "фокус вернулся на «Написать» в панели");
  });

  test("Escape в текстовом поле модалки, открытой из шторки, возвращает фокус на «Написать»", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(`document.querySelector("[data-sheet-apply]").click()`);
    await ctx.page.wait(450);
    await ctx.page.eval(`document.getElementById("cf-name").focus()`);
    await ctx.page.press("Escape");
    await ctx.page.wait(700);
    const s = await ctx.page.eval(state);
    assert.equal(s.modalHidden, true, "модалка закрыта");
    assert.equal(s.barSuppressed, false, "панель больше не подавлена");
    assert.equal(s.barVisibility, "visible", "панель видима");
    assert.equal(s.focusOnOpener, true, "фокус вернулся на «Написать» в панели");
  });

  test("на странице без модалки «Оставить заявку» — ссылка на форму главной", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    const href = await ctx.page.eval(
      `document.querySelector("#contact-sheet .sheet__actions a.abra-cta").getAttribute("href")`
    );
    assert.equal(href, "/#contact");
  });

  test("при повороте шире 720px шторка закрывается сразу, прокрутка возвращается", async () => {
    await ctx.page.goto("/", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.resize(1024, 768);
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, true, "шторка закрыта");
    assert.equal(s.open, false);
    assert.equal(s.overflow, "", "прокрутка разблокирована");
    assert.equal(s.focusInSheet, false, "фокус не остался в скрытой шторке");
    assert.equal(s.barSuppressed, false);
  });

  /* Настоящее восстановление из bfcache в headless Chrome воспроизводится
     ненадёжно — проверяем обработчик синтетическим pageshow с persisted. */
  test("pageshow из bfcache закрывает открытую шторку без возврата фокуса", async () => {
    await ctx.page.goto("/cases.html", { width: 390, height: 844 });
    await openSheet();
    await ctx.page.eval(
      `window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`
    );
    const s = await ctx.page.eval(state);
    assert.equal(s.sheetHidden, true, "шторка закрыта сразу");
    assert.equal(s.overflow, "", "прокрутка разблокирована");
    assert.equal(s.focusOnOpener, false, "фокус не переводится на «Написать»");
  });

  test("при уменьшении движения открывается и закрывается без анимации", async () => {
    await ctx.page.goto("/", { width: 390, height: 844, reducedMotion: true });
    await ctx.page.eval(`document.querySelector("[data-sheet-open]").click()`);
    assert.equal((await ctx.page.eval(state)).sheetHidden, false);
    await ctx.page.press("Escape");
    await ctx.page.wait(50);
    assert.equal((await ctx.page.eval(state)).sheetHidden, true);
  });
});

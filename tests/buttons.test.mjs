/* Система кнопок: уровень 2 (компактные скобки) и уровень 3 (подчёркивания). */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./helpers/browser.mjs";
import { PAGES, read } from "./helpers/pages.mjs";

describe("уровень 2 — разметка", () => {
  for (const { file } of PAGES) {
    test(`${file}: «Написать» и «Хорошо» — компактные скобки`, () => {
      const html = read(file);
      assert.match(html, /class="abra-cta abra-cta--compact nav__cta"/);
      assert.match(html, /class="abra-cta abra-cta--compact cookie-banner__accept"/);
    });
  }
});

describe("уровень 2 — поведение", () => {
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

  test("«Написать» в шапке: 44px, при наведении уголки только расходятся", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const rest = await page.eval(`(() => {
      const btn = document.querySelector(".nav__cta");
      return {
        height: btn.getBoundingClientRect().height,
        corners: btn.querySelectorAll(".abra-cta__corner").length,
        width: getComputedStyle(btn.querySelector(".abra-cta__corner--tl")).width,
      };
    })()`);
    assert.equal(rest.height, 44);
    assert.equal(rest.corners, 4);
    assert.equal(rest.width, "8px");

    await page.hover(".nav__cta");
    const hovered = await page.eval(`(() => {
      const cs = getComputedStyle(document.querySelector(".nav__cta .abra-cta__corner--tl"));
      return { width: cs.width, transform: cs.transform };
    })()`);
    assert.equal(hovered.width, "8px", "компактные скобки не строят рамку");
    assert.equal(hovered.transform, "matrix(1, 0, 0, 1, -3, 0)");
  });

  test("меню «Написать» по-прежнему раскрывается", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const opened = await page.eval(`(() => {
      document.querySelector(".nav__cta").click();
      return !document.getElementById("nav-contact-menu").hidden;
    })()`);
    assert.equal(opened, true);
  });

  test("«Хорошо»: 44px и по-прежнему закрывает баннер", async () => {
    await page.goto("/cases.html", { width: 390, height: 844 });
    await page.eval("localStorage.clear()");
    await page.goto("/cases.html", { width: 390, height: 844 });
    const height = await page.eval(
      `document.querySelector(".cookie-banner__accept").getBoundingClientRect().height`
    );
    assert.equal(height, 44);
    await page.eval(`document.querySelector(".cookie-banner__accept").click()`);
    await page.wait(500);
    const visibility = await page.eval(
      `getComputedStyle(document.getElementById("cookie-banner")).visibility`
    );
    assert.equal(visibility, "hidden");
  });
});

describe("уровень 3 — подчёркивания", () => {
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

  const afterTransform = (selector) =>
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)}), "::after").transform`;

  test("пункт шапки: в покое линии нет, при наведении — на всю ширину", async () => {
    await page.goto("/cases.html", { width: 1440 });
    const link = ".nav__links a:nth-child(2)";
    assert.equal(await page.eval(afterTransform(link)), "matrix(0, 0, 0, 1, 0, 0)");
    await page.hover(link);
    assert.equal(await page.eval(afterTransform(link)), "matrix(1, 0, 0, 1, 0, 0)");
  });

  test("оглавление статьи: активный пункт подчёркнут, левой полосы нет", async () => {
    await page.goto("/growth-system.html", { width: 1440, height: 900 });
    await page.eval(`window.scrollTo({ top: 1600, behavior: "instant" })`); // на сайте scroll-behavior: smooth
    await page.wait(700);
    const active = await page.eval(`(() => {
      const link = document.querySelector(".case__toc-link.is-active");
      if (!link) return null;
      const cs = getComputedStyle(link);
      return { size: cs.backgroundSize, border: cs.borderLeftWidth };
    })()`);
    assert.ok(active, "в оглавлении есть активный пункт");
    assert.equal(active.size, "100% 1px");
    assert.equal(active.border, "0px");
  });

  /* getClientRects().length не годится для проверки переноса у
     inline-block: снаружи это один атомарный бокс, поэтому у него
     length === 1 и при переносе внутри тоже — сам факт переноса
     виден только в возросшей высоте. Сравниваем высоту с одиночной
     строкой (высота у .case__toc-link, где .alnum нет и переноса
     точно быть не может). */
  test("оглавление статьи: пункты с .alnum не переносятся на вторую строку", async () => {
    await page.goto("/growth-system.html", { width: 1440, height: 900 });
    const heights = await page.eval(`[...document.querySelectorAll(".case__toc-link")].map(
      (a) => ({ text: a.textContent.trim(), height: a.getBoundingClientRect().height })
    )`);
    const singleLine = heights.find((item) => !item.text.includes(".")).height;
    const broken = heights.filter((item) => item.height > singleLine + 1).map((item) => item.text);
    assert.deepEqual(broken, [], "все пункты оглавления должны быть в одну строку");
  });
});

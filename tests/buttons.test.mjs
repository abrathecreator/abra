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

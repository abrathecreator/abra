/* Таблица страниц и чтение файлов проекта — общие для всех тестов.
   Пути с .html: vite preview отдаёт файл по точному имени. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const read = (relPath) => readFileSync(join(ROOT, relPath), "utf8");

export const WIDTHS = [1440, 1024, 768, 390, 375, 320];

export const PAGES = [
  { file: "index.html", path: "/", section: "home", current: "page", modal: true },
  { file: "privacy.html", path: "/privacy.html", section: null, current: null, modal: false },
  { file: "terms.html", path: "/terms.html", section: null, current: null, modal: false },
  { file: "consent.html", path: "/consent.html", section: null, current: null, modal: false },
  { file: "404.html", path: "/404.html", section: null, current: null, modal: false },
  { file: "case-zhbi.html", path: "/case-zhbi.html", section: "cases", current: "true", modal: true },
  { file: "unit-economics.html", path: "/unit-economics.html", section: null, current: null, modal: true },
  { file: "growth-system.html", path: "/growth-system.html", section: "articles", current: "true", modal: true },
  { file: "cases.html", path: "/cases.html", section: "cases", current: "page", modal: false },
  { file: "articles.html", path: "/articles.html", section: "articles", current: "page", modal: false },
];

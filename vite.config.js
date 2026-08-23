import { defineConfig } from "vite";
import { resolve } from "path";

// DEPLOY_TARGET=gh-pages → base "/abra/" (project pages URL)
// otherwise (Cloudflare Pages, local dev) → base "/"
const base = process.env.DEPLOY_TARGET === "gh-pages" ? "/abra/" : "/";

export default defineConfig(() => ({
  base,
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacy: resolve(__dirname, "privacy.html"),
        consent: resolve(__dirname, "consent.html"),
        terms: resolve(__dirname, "terms.html"),
        notFound: resolve(__dirname, "404.html"),
        unitEconomics: resolve(__dirname, "unit-economics.html"),
        caseTemplate: resolve(__dirname, "case-template.html"),
        caseZhbi: resolve(__dirname, "case-zhbi.html"),
      },
    },
  },
}));

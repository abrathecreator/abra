import { defineConfig } from "vite";

// DEPLOY_TARGET=gh-pages → base "/abra/" (project pages URL)
// otherwise (Cloudflare Pages, local dev) → base "/"
const base = process.env.DEPLOY_TARGET === "gh-pages" ? "/abra/" : "/";

export default defineConfig(() => ({
  base,
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
}));

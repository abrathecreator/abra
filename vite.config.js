import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/abra/" : "/",
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
}));

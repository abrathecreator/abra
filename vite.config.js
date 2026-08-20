import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: "/",
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
}));

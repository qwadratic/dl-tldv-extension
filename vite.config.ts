import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [
    {
      name: "copy-extension-assets",
      writeBundle() {
        const dist = resolve(__dirname, "dist");
        mkdirSync(dist, { recursive: true });

        copyFileSync(
          resolve(__dirname, "src/manifest.json"),
          resolve(dist, "manifest.json"),
        );

        copyFileSync(
          resolve(__dirname, "src/styles.css"),
          resolve(dist, "styles.css"),
        );

        copyFileSync(
          resolve(
            __dirname,
            "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm",
          ),
          resolve(dist, "ffmpeg-core.wasm"),
        );
        copyFileSync(
          resolve(
            __dirname,
            "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js",
          ),
          resolve(dist, "ffmpeg-core.js"),
        );
      },
    },
  ],
});

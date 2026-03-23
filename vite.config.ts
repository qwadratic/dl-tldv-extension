import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Browser extension constraints:
// - Content scripts cannot use ES modules (no import/export)
// - Chrome MV3 service workers support ES modules (with "type": "module")
//   but Firefox MV3 does NOT support module service workers
// Solution: Build as IIFE with all deps inlined. Since rollup only allows
// IIFE with a single input, we do two sequential builds via a plugin.

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        format: "iife",
        entryFileNames: "[name].js",
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    {
      name: "build-extra-scripts",
      async writeBundle() {
        const { build } = await import("vite");

        // Build content script as IIFE
        await build({
          configFile: false,
          build: {
            outDir: resolve(__dirname, "dist"),
            emptyOutDir: false,
            sourcemap: true,
            target: "es2020",
            lib: {
              entry: resolve(__dirname, "src/content.ts"),
              formats: ["iife"],
              name: "DlTldvContent",
              fileName: () => "content.js",
            },
            rollupOptions: {
              output: { inlineDynamicImports: true },
            },
          },
        });

        // Build offscreen script as IIFE (needs Web Worker support for ffmpeg.wasm)
        await build({
          configFile: false,
          build: {
            outDir: resolve(__dirname, "dist"),
            emptyOutDir: false,
            sourcemap: true,
            target: "es2020",
            lib: {
              entry: resolve(__dirname, "src/offscreen.ts"),
              formats: ["iife"],
              name: "DlTldvOffscreen",
              fileName: () => "offscreen.js",
            },
            rollupOptions: {
              output: { inlineDynamicImports: true },
            },
          },
        });
      },
    },
    {
      name: "copy-extension-assets",
      closeBundle() {
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
          resolve(__dirname, "src/offscreen.html"),
          resolve(dist, "offscreen.html"),
        );
        copyFileSync(
          resolve(__dirname, "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm"),
          resolve(dist, "ffmpeg-core.wasm"),
        );
        copyFileSync(
          resolve(__dirname, "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js"),
          resolve(dist, "ffmpeg-core.js"),
        );

        // Copy ffmpeg worker with stable name (hashed name breaks in IIFE)
        const assetsDir = resolve(dist, "assets");
        if (existsSync(assetsDir)) {
          const files = readdirSync(assetsDir);
          const workerFile = files.find((f: string) => f.startsWith("worker-") && f.endsWith(".js"));
          if (workerFile) {
            copyFileSync(resolve(assetsDir, workerFile), resolve(dist, "ffmpeg-worker.js"));
          }
        }
      },
    },
  ],
});

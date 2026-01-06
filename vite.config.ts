import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import fs from "node:fs";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// @ts-expect-error process is a nodejs global
const base = process.env.VITE_BASE || '/';

const cargoToml = fs.readFileSync("./src-tauri/Cargo.toml", "utf-8");
const versionMatch = cargoToml.match(/^version\s*=\s*"(.*)"/m);
const version = versionMatch ? versionMatch[1] : "unknown";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [preact()],
  base: base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['preact', 'preact/hooks', 'preact/compat'],
          charting: ['chart.js', 'react-chartjs-2', 'chartjs-plugin-zoom'],
          tauri: ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-opener', '@tauri-apps/plugin-clipboard-manager'],
          utils: ['papaparse', 'html2canvas', 'fit-curve', 'regression'],
        },
      },
    },
  },
}));

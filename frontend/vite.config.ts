import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Build version stamp — baked in at BUILD time so the deployed bundle
// permanently identifies which PR / commit / build moment it came from.
// Vercel exposes VERCEL_GIT_PULL_REQUEST_ID (on PR preview + merge builds)
// and VERCEL_GIT_COMMIT_SHA; local `bun dev` builds get a dev label.
const now = new Date()
const dateStamp = now.getDate() + "/" + (now.getMonth() + 1) + "/" + String(now.getFullYear()).slice(-2)
const timeStamp = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0")
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local"
const pr = process.env.VERCEL_GIT_PULL_REQUEST_ID || ""
const buildVersion = (pr ? "PR " + pr + " \u00b7 " : "") + sha + " \u00b7 " + dateStamp + " \u00b7 " + timeStamp

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    emptyOutDir: false,
  },
  define: {
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || '/api'),
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
})

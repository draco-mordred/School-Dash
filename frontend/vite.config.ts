import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Build version stamp — baked in at BUILD time so the deployed bundle
// permanently identifies which PR / commit / build moment it came from.
// Vercel exposes VERCEL_GIT_PULL_REQUEST_ID (on PR preview + merge builds)
// and VERCEL_GIT_COMMIT_SHA; local `bun dev` builds get a dev label.
const now = new Date()
// Africa/Lagos so the stamped build moment matches the team's clock.
const stampParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "numeric",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).formatToParts(now)
const stampPart = (type: string) => stampParts.find((p) => p.type === type)?.value || ""
const dateStamp = stampPart("day") + "/" + stampPart("month") + "/" + stampPart("year")
const timeStamp = stampPart("hour") + ":" + stampPart("minute")
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local"
// PR number: VERCEL_GIT_PULL_REQUEST_ID is not set on every Vercel deploy
// type, so also parse "#N" out of the merge/squash commit message
// ("Merge pull request #55 from ..." / "... (#54)") as a fallback.
const pr = process.env.VERCEL_GIT_PULL_REQUEST_ID || (process.env.VERCEL_GIT_COMMIT_MESSAGE || "").match(/#(\d+)/)?.[1] || ""
const buildVersion = (pr ? "PR " + pr + " · " : "") + sha + " · " + dateStamp + " · " + timeStamp

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

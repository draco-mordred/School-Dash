import { Inngest } from "inngest";

// Dev mode by default. Set NODE_ENV=production (e.g. on Render) to switch to
// Inngest Cloud mode with request signature validation via INNGEST_SIGNING_KEY.
const isProduction = process.env.NODE_ENV === "production";

export const inngest = new Inngest({
  id: "medlog-lms",
  isDev: !isProduction,
  eventKey: process.env.INNGEST_EVENT_KEY ?? "dev",
  ...(isProduction
    ? { signingKey: process.env.INNGEST_SIGNING_KEY }
    : { devServerUrl: process.env.INNGEST_DEVSERVER_URL ?? "http://localhost:8288" }),
});

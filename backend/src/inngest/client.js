import { Inngest } from "inngest";

// Keep in sync with client.ts. Bun resolves ./client to this .js file at runtime,
// so this is the file that actually runs in production on Render.
const isProduction = process.env.NODE_ENV === "production";

export const inngest = new Inngest({
  id: "medlog-lms",
  isDev: !isProduction,
  eventKey: process.env.INNGEST_EVENT_KEY ?? "dev",
  ...(isProduction
    ? { signingKey: process.env.INNGEST_SIGNING_KEY }
    : { devServerUrl: process.env.INNGEST_DEVSERVER_URL ?? "http://localhost:8288" }),
});

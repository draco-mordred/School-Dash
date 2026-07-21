import { Inngest } from "inngest";

// Local development
export const inngest = new Inngest({
  id: "medlog-lms",
  isDev: true,
  eventKey: process.env.INNGEST_EVENT_KEY ?? "dev",
  devServerUrl: process.env.INNGEST_DEVSERVER_URL ?? "http://localhost:8288",
});

// Production (signing key required via env or option)
// export const inngest = new Inngest({ id: "my-app" });

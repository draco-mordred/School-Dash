import { Inngest } from "inngest";

// Local development
export const inngest = new Inngest({ id: "medlog-lms", isDev: true });

// Production (signing key required via env or option)
// export const inngest = new Inngest({ id: "my-app" });

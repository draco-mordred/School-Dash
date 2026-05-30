import { Inngest } from "inngest";

// Create a client to send and receive events
// export const inngest = new Inngest({ id: "my-app"});
// Local development
export const inngest = new Inngest({ id: "sms-lms", isDev: true });

// Production (signing key required via env or option)
// const inngest = new Inngest({ id: "my-app" });

// Create an empty array wherer we'll export future Inngest functions
export const functions = [];
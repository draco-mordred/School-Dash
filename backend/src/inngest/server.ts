import * as dotenv from "dotenv";
import { spawn } from "node:child_process";

dotenv.config();

const port = process.env.PORT || "5000";
const targetUrl = `http://localhost:${port}/api/inngest`;

console.log(`Starting Inngest on ${targetUrl}`);

const bunxCommand = process.platform === "win32" ? "bunx" : "bunx";
const child = spawn(bunxCommand, ["inngest-cli@latest", "dev", "-u", targetUrl], {
  shell: true,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start Inngest:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

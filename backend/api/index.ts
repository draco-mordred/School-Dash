import serverless from "serverless-http";
import app from "../src/server";

// Log environment on startup
console.log("⚙️ Serverless Handler Bootstrap:");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "NOT SET"}`);
console.log(`  VERCEL: ${process.env.VERCEL || "NOT SET"}`);
console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || "NOT SET"}`);
console.log(`  MEDLOG_MONGO_URL: ${process.env.MEDLOG_MONGO_URL ? "SET" : "NOT SET"}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`);
console.log(`  CLIENT_URL: ${process.env.CLIENT_URL || "NOT SET"}`);

let handler;
try {
  handler = serverless(app);
  console.log("✅ Handler initialized successfully");
} catch (error) {
  console.error("❌ Handler initialization failed:", error);
  throw error;
}

export { handler };
export default handler;

// console.log("Hello via Bun!");

//let's create a simple server
import cookieParser from "cookie-parser";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv"
import cors from "cors";
import console from "node:console";
import * as dns from "node:dns";
import { connectDB } from "./config/db"; //import the connectDB function to connect to the database
import userRoutes from "./routes/user";
import LogsRouter from "./routes/activitieslog";
import academicYearRouter from "./routes/academicYear";
import academicClockRouter from "./routes/academicClock";
import classRouter from "./routes/classes";
import courseRouter from "./routes/courses";
import "./models/postings"; // ensure postings models are registered
import "./models/clinicalRotation"; // register ClinicalRotation mongoose model
import "./models/logbookEntry"; // ensure LogbookEntry mongoose model is registered
import { serve } from "inngest/express";
import { inngest } from "./inngest";
import { generateExam, generateTimeTable, generateAttendance, bulkCreateUsers, rotationNotify } from "./inngest/functions";
import timeRouter from "./routes/timetable";
import examRouter from "./routes/exam";
import dashBoardRouter from "./routes/dashboard";
import attendanceRouter from "./routes/attendance";
import notificationRouter from "./routes/notification";
import routerFor500LevelPostings from "./routes/for500LevelPostings";
import rotationSchedulesRouter from './routes/rotationSchedules';
import logbookEntryRouter from "./routes/logbookEntry";
import hospitalDataRouter from "./routes/hospitalData";
import activityEntryRouter from "./routes/activityEntry";
import mordredAIRouter from "./routes/mordred"; // import the mordredRouter

//Add this line to set custom DNS servers for the application, which can help resolve connectivity issues with MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// The above line sets the DNS servers to Google's public DNS servers (https://developers.google.com/speed/public-dns), as well as Cloudflare's DNS server (https://developers.cloudflare.com/

//load variables from the .env file
dotenv.config();

export const app: Application = express();
const PORT = process.env.PORT || 5000;
const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_URL || process.env.NOW_REGION);
const apiBase = isVercelRuntime ? "" : "/api";
 
//next we'll add security middleware/headers + make sure to listen on our *root file* for changes
app.use(helmet()); // Security middleware to set various HTTP headers for app security
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(cookieParser()); // Middleware to parse cookies

//log http requests to console
// NODE_ENV missing in .env file, but it is set to "development" by default when running with nodemon, so the morgan middleware will be used for logging HTTP requests in development mode. If you want to explicitly set the NODE_ENV variable, you can add it to your .env file like this: NODE_ENV=development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // HTTP request logger middleware for development
}

//cross-origin resource sharing (CORS) middleware to allow requests from different origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://localhost:5173",
  "http://127.0.0.1:5173",
  "https://127.0.0.1:5173",
].filter((origin): origin is string => origin !== undefined && origin !== "");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
 
//Health cheack route to check if the server is running
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy!" });
});

//Import routes here
app.use(`${apiBase}/users`, userRoutes); // Use the user routes for any requests to /api/users
app.use(`${apiBase}/activities`, LogsRouter); // Use the user routes for any requests to /api/users
app.use(`${apiBase}/academic-years`, academicYearRouter); // Use the academic year routes for any requests to /api/academic-years
app.use(`${apiBase}/academic-clocks`, academicClockRouter);
app.use(`${apiBase}/classes`, classRouter);
// Courses API (was previously also mounted at /api/subjects)
app.use(`${apiBase}/courses`, courseRouter);
app.use(`${apiBase}/timetables`, timeRouter)
app.use(`${apiBase}/exams`, examRouter);
app.use(`${apiBase}/dashboard`, dashBoardRouter);
app.use(`${apiBase}/attendance`, attendanceRouter);
app.use(`${apiBase}/notifications`, notificationRouter);
app.use(`${apiBase}/og-ped-rotations`, routerFor500LevelPostings);
app.use(`${apiBase}/rotation-schedules`, rotationSchedulesRouter);
app.use(`${apiBase}/logbook-entries`, logbookEntryRouter);
app.use(`${apiBase}/hospital-data`, hospitalDataRouter);
app.use(`${apiBase}/activity-entries`, activityEntryRouter);
app.use(`${apiBase}/inngest`, serve({
  client: inngest,
  functions: [generateTimeTable, generateExam, generateAttendance, bulkCreateUsers, rotationNotify]
})
);
app.use(`${apiBase}/mordred`, mordredAIRouter); // Mount the Mordred AI routes at /api/mordred

// Debug: list all registered routes (useful in serverless where /api prefix may be stripped)
app.get(`${apiBase}/_routes`, (req: Request, res: Response) => {
  try {
    const stack = (app as any)._router?.stack || [];
    const routes: Array<{ path: string; methods: string[] }> = [];
    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase());
        routes.push({ path: `${apiBase}${layer.route.path}`, methods });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        for (const nested of layer.handle.stack) {
          if (nested.route && nested.route.path) {
            const methods = Object.keys(nested.route.methods || {}).map((m) => m.toUpperCase());
            routes.push({ path: `${apiBase}${nested.route.path}`, methods });
          }
        }
      }
    }
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enumerate routes', detail: String(err) });
  }
});


//Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ status: "Error!", message: err.message })
});
//or write normally without the next function if you don't need it
// app.use(
//   (err: Error, req: Request, res: Response) => {
//   console.error(err.stack);
//   res.status(500).json({ status: "Error!", message: err.message });
// });

// Start the server and listen on the specified port
if (!isVercelRuntime) {
  connectDB().then(async () => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

      // Start scheduled notifications worker (runs every minute) only when not using Inngest scheduling
//     const useInngest = process.env.USE_INNGEST_SCHEDULING === "1" || process.env.USE_INNGEST_SCHEDULING === "true";
//     if (!useInngest) {
//       try {
//         const { processDueScheduledNotifications, updateRotationStatuses } = await import('./workers/scheduledNotificationsWorker');
//         // run immediately and then every 60s
//         processDueScheduledNotifications().catch((e: any) => console.error('scheduled worker error', e));
//         // also update rotation statuses on the same cadence
//         updateRotationStatuses().catch((e: any) => console.error('rotation status worker error', e));
//         setInterval(() => {
//           processDueScheduledNotifications().catch((e: any) => console.error('scheduled worker error', e));
//           updateRotationStatuses().catch((e: any) => console.error('rotation status worker error', e));
//         }, 60 * 1000);
//       } catch (err) {
//         console.warn('Scheduled notifications worker not started', (err as Error).message);
//       }
//     } else {
//       console.log('Using Inngest delayed scheduling for rotation notifications; DB worker disabled.');
//     }

//     // initialize optional WebSocket server
//     try {
//       const { initWebSocket } = require('./utils/ws');
//       initWebSocket(server as any);
//     } catch (err) {
//       // not critical if ws package isn't installed
//       console.warn('WebSocket init failed or not available', err);
//     }

  }).catch((error) => {
      console.error("Failed to connect to the database:", error);
  });
} else {
  connectDB().catch((error) => {
      console.error("Failed to connect to the database on Vercel startup:", error);
  });
}

export default app;
//you can use any of these scripts to run the server with nodemon or bun
  // "scripts": {
  //   "dev": "nodemon --exec bun run index.ts",
  //   "start": "bun --watch index.ts"
  // },
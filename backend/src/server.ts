// console.log("Hello via Bun!");

//let's create a simple server
import cookieParser from "cookie-parser";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv"
import cors from "cors";
import console from "node:console";
import { connectDB } from "./config/db"; //import the connectDB function to connect to the database
import userRoutes from "./routes/user";
import LogsRouter from "./routes/activitieslog";
import academicYearRouter from "./routes/academicYear";
import classRouter from "./routes/classes";

//Add this line to set custom DNS servers for the application, which can help resolve connectivity issues with MongoDB Atlas
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// The above line sets the DNS servers to Google's public DNS servers (https://developers.google.com/speed/public-dns), as well as Cloudflare's DNS server (https://developers.cloudflare.com/

//load variables from the .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
 
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
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Allow requests from this origin (your frontend)
    credentials: true // Allow cookies to be sent with requests
}) 
);

//Health cheack route to check if the server is running
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy!" });
});

//Import routes here
app.use("/api/users", userRoutes); // Use the user routes for any requests to /api/users
app.use("/api/activities", LogsRouter); // Use the user routes for any requests to /api/users
app.use("/api/academic-years", academicYearRouter); // Use the academic year routes for any requests to /api/academic-years
app.use('/api/classes', classRouter);

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
connectDB().then(() => {
    app.listen(PORT, () => {
    //connectDB(); //connect to the database when the server starts
    console.log(`Server is running on http://localhost:${PORT}`);
});

})
//you can use any of these scripts to run the server with nodemon or bun
  // "scripts": {
  //   "dev": "nodemon --exec bun run index.ts",
  //   "start": "bun --watch index.ts"
  // },
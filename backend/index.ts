// console.log("Hello via Bun!");

//let's create a simple server
import cookieParser from "cookie-parser";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose"; 
import dotenv from "dotenv"
import cors from "cors";
import console from "node:console";

//Add this line to set custom DNS servers for the application, which can help resolve connectivity issues with MongoDB Atlas
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// The above line sets the DNS servers to Google's public DNS servers (https://developers.google.com/speed/public-dns), as well as Cloudflare's DNS server (https://developers.cloudflare.com/

//load variables from the .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

//next we'll add security middleware/headers + make sure to listen on our *root file* for changes
app.use(helmet()); // Security middleware to set various HTTP headers for app security
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(cookieParser()); // Middleware to parse cookies

//log http requests to console
if (process.env.NODE_ENV === "development") {
    //const morgan = require("morgan"); // HTTP request logger middleware
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
// app.get("/", (req: Request, res: Response) => {
//   res.send("Hello, Express with TypeScript!");
// });

//Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ status: "Error!", message: err.message });
});
//or write normally without the next function if you don't need it
// app.use(
//   (err: Error, req: Request, res: Response) => {
//   console.error(err.stack);
//   res.status(500).json({ status: "Error!", message: err.message });
// });

//Connect db here
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL as string);
    console.log(`MongoDB Connected Online @: ${conn.connection.host}`);
  } catch (error) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected Offline @: ${conn.connection.host}`); 
    // The above connection string is for a local MongoDB instance, which can be used as a fallback if the connection to MongoDB Atlas fails. This allows the application to still function and store data locally, even if there are issues with the remote database connection.
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`); //display error in console
    process.exit(1); //exit process with failure
    }
  }
}

// Start the server and listen on the specified port
app.listen(PORT, () => {
  connectDB(); //connect to the database when the server starts
  console.log(`Server is running on http://localhost:${PORT}`);
});

//you can use any of these scripts to run the server with nodemon or bun
  // "scripts": {
  //   "dev": "nodemon --exec bun run index.ts",
  //   "start": "bun --watch index.ts"
  // },
successfully downloaded text file (SHA: c68c46f5fc83f47aab88da9df5fc8fe2970ffba7)
import mongoose from "mongoose";

// Connect db here
export const connectDB = async () => {
  try {
    // Accept all names used across the repo/docs: MEDLOG_MONGO_URL (README,
    // ENVIRONMENT_SETUP.md, api/index.ts) plus MONGODB_URI / MONGO_URI variants.
    const link =
      process.env.MEDLOG_MONGO_URL ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;
    if (!link) {
      throw new Error("Missing MongoDB connection string. Set MEDLOG_MONGO_URL, MONGODB_URI, or MONGO_URI.");
    }

    const conn = await mongoose.connect(link, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 40000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    console.log(`MongoDB Connected ONLINE @: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${(error as Error).message}`);
    throw error;
  }
};

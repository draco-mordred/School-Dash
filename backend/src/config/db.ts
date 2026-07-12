import mongoose from "mongoose";

// Connect db here
export const connectDB = async () => {
  try {
    const link = process.env.MEDLOG_MONGO_URL || process.env.MONGO_URI;
    if (!link) {
      throw new Error("Missing MongoDB connection string. Set MEDLOG_MONGO_URL or MONGO_URI.");
    }

    const conn = await mongoose.connect(link, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 5000,
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

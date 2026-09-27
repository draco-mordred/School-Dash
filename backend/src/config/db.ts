import mongoose from "mongoose";

// Connect db here
export const connectDB = async () => {
  try {
    const link = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!link) {
      throw new Error("Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI.");
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

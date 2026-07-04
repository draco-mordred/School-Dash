import mongoose from "mongoose";
// Connect db here
export const connectDB = async () => {
    try {
        const link = process.env.MEDLOG_MONGO_URL || process.env.MONGO_URI;
        if (!link) {
            throw new Error("Missing MongoDB connection string. Set MEDLOG_MONGO_URL or MONGO_URI.");
        }
        const conn = await mongoose.connect(link, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected ONLINE @: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

import mongoose from "mongoose"; 

//Connect db here
export const connectDB = async () => {
  try {
    // const conn = await mongoose.connect(process.env.MEDLOG_MONGO_URL as string);
    const link = process.env.MEDLOG_MONGO_URL || process.env.MONGO_URI;
    const conn = await mongoose.connect(process.env.MEDLOG_MONGO_URL as string);
    console.log(`MongoDB Connected ONLINE @: ${conn.connection.host} via ${link}`);
  } catch (error) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI as string);
      console.log(`MongoDB Connected OFFLINE @: ${conn.connection.host} via ${process.env.MONGO_URI}`);  // This connection string is for a local MongoDB instance, which can be used as a fallback if the connection to MongoDB Atlas fails. This allows the application to still function and store data locally, even if there are issues with the remote database connection.
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`); //display error in console
      process.exit(1); //exit process with failure
    }
  }
}
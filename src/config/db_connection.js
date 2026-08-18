import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Reuse existing connection
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return;
    }

    // Check environment variable
    if (!process.env.DB_URL) {
      throw new Error("DB_URL environment variable is not defined");
    }

    await mongoose.connect(process.env.DB_URL);

    console.log("DB Connected!");
  } catch (error) {
    console.error("MongoDB connection error:", error);

    // IMPORTANT:
    // Throw the error so Vercel knows the function failed.
    throw error;
  }
};

export default connectDB;

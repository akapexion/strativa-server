import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present (in development)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const FALLBACK_DB_URL =
  "mongodb://asadkaptech_db_user:apexion-strativa@ac-q3go0yc-shard-00-00.fhcmxs2.mongodb.net:27017,ac-q3go0yc-shard-00-01.fhcmxs2.mongodb.net:27017,ac-q3go0yc-shard-00-02.fhcmxs2.mongodb.net:27017/?ssl=true&replicaSet=atlas-qd68km-shard-0&authSource=admin&appName=Cluster0/strativa-operations";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const dbUrl =
      process.env.DB_URL ||
      process.env.DATABASE_URL ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      FALLBACK_DB_URL;

    const conn = await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("DB Connected!");
    return conn;
  } catch (err) {
    console.error("DB Connection Error:", err);
    throw err;
  }
};

export default connectDB;
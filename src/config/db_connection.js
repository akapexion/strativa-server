import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present (in development)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    try {
        const dbUrl = process.env.DB_URL;
        if (!dbUrl) {
            console.error("DB_URL environment variable is not defined!");
            return;
        }
        const conn = await mongoose.connect(dbUrl);
        console.log("DB Connected!");
        return conn;
    } catch (err) {
        console.error("DB Connection Error:", err);
        throw err;
    }
};

export default connectDB;
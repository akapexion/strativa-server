import mongoose from 'mongoose';
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.DB_URL);
        console.log("DB Connected!");
    }
    catch(err){
        console.log(err);
    }
}

export default connectDB;
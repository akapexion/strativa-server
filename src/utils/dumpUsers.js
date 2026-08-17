import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Users from '../models/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dump = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB");
    const allUsers = await Users.find({});
    console.log("USERS IN DATABASE:");
    allUsers.forEach(u => {
      console.log(`Name: ${u.user_fullname}, Role: ${u.user_role}, Designation: ${u.user_designation}, Code: ${u.user_code}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

dump();

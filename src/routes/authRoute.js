import express from 'express'
import { allManagers, login } from '../controllers/authController.js';

const authRoute = express.Router();

authRoute.post("/login", login);
authRoute.get("/all-managers", allManagers);


export default authRoute;
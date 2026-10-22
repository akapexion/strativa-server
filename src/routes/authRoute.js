import express from "express";
import { allManagers, login, preValidateUser } from "../controllers/authController.js";
import { checkLoginRateLimit } from "../middleware/rateLimiter.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const authRoute = express.Router();

authRoute.post("/pre-validate", checkLoginRateLimit, preValidateUser);
authRoute.post("/login", checkLoginRateLimit, login);
authRoute.get("/all-managers", verifyToken, allManagers);

export default authRoute;
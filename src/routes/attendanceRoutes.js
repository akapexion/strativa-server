import express from "express";
import { checkIn, checkOut, getMyAttendance, getTeamAttendance, markManualAttendance } from "../controllers/attendanceController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const attendanceRoute = express.Router();

attendanceRoute.use(verifyToken);

attendanceRoute.post("/check-in", checkIn);
attendanceRoute.post("/check-out", checkOut);
attendanceRoute.get("/my-attendance", getMyAttendance);
attendanceRoute.get("/team-attendance", getTeamAttendance);
attendanceRoute.post("/mark-manual", markManualAttendance);

export default attendanceRoute;

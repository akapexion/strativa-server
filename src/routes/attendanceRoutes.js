import express from "express";
import multer from "multer";
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTeamAttendance,
  markManualAttendance,
  importAttendancePunches,
} from "../controllers/attendanceController.js";
import { verifyToken, requireManagerOrAdmin } from "../middleware/authMiddleware.js";

const uploadMemory = multer({ storage: multer.memoryStorage() });

const attendanceRoute = express.Router();

attendanceRoute.use(verifyToken);

attendanceRoute.post("/check-in", checkIn);
attendanceRoute.post("/check-out", checkOut);
attendanceRoute.get("/my-attendance", getMyAttendance);
attendanceRoute.get("/team-attendance", requireManagerOrAdmin, getTeamAttendance);
attendanceRoute.post("/mark-manual", requireManagerOrAdmin, markManualAttendance);
attendanceRoute.post(
  "/import-punches",
  requireManagerOrAdmin,
  uploadMemory.single("csv_file"),
  importAttendancePunches
);

export default attendanceRoute;

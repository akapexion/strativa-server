import express from "express";
import {
  getAllFirms,
  getSingleFirm,
  createFirm,
  updateFirm,
  getFirmCapacity,
  provisionOrGetFirmManager,
} from "../controllers/firmController.js";
import { verifyToken, requireAdmin } from "../middleware/authMiddleware.js";

const firmRoute = express.Router();

firmRoute.use(verifyToken);

// Manager and Admin can check current firm capacity
firmRoute.get("/capacity", getFirmCapacity);

// Admin-only firm management
firmRoute.get("/all", requireAdmin, getAllFirms);
firmRoute.get("/:id", requireAdmin, getSingleFirm);
firmRoute.post("/create", requireAdmin, createFirm);
firmRoute.put("/update/:id", requireAdmin, updateFirm);
firmRoute.get("/:id/manager", requireAdmin, provisionOrGetFirmManager);
firmRoute.post("/:id/manager", requireAdmin, provisionOrGetFirmManager);

export default firmRoute;

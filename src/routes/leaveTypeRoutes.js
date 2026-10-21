import express from "express";
import { addLeaveType, getAllLeaveTypes, updateLeaveType, deleteLeaveType } from "../controllers/leaveTypeController.js";

const leaveTypeRoute = express.Router();

// Add Leave Type
leaveTypeRoute.post("/add-leave-type", addLeaveType);

// Get all Leave Types
leaveTypeRoute.get("/all-leave-types", getAllLeaveTypes);

// Update Leave Type
leaveTypeRoute.put("/update-leave-type/:id", updateLeaveType);

// Delete Leave Type
leaveTypeRoute.delete("/delete-leave-type/:id", deleteLeaveType);

export default leaveTypeRoute;
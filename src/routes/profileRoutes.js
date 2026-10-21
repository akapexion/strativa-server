import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  changePassword,
} from "../controllers/profileController.js";

const profileRoute = express.Router();

// ✅ Routes
profileRoute.get("/:id", getProfile);
profileRoute.put("/:id/upload-image", upload.single("employee_image"), uploadProfileImage);
profileRoute.put("/:id/change-password", changePassword);

export default profileRoute;
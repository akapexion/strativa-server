import express from "express";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getMyNotifications);
router.put("/read/:id", markAsRead);
router.put("/read-all", markAllAsRead);
router.delete("/clear-all", clearAllNotifications);

export default router;

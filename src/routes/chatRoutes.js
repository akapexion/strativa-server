import express from "express";
import {
  getEligibleParticipants,
  getConversations,
  getConversationMessages,
  sendMessage,
} from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const chatRoute = express.Router();

chatRoute.use(verifyToken);

chatRoute.get("/participants", getEligibleParticipants);
chatRoute.get("/conversations", getConversations);
chatRoute.get("/messages/:conversationId", getConversationMessages);
chatRoute.post("/send", sendMessage);

export default chatRoute;

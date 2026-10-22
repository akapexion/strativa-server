import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message_text: {
      type: String,
      required: true,
      trim: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation_id: 1, createdAt: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;

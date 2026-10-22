import mongoose from "mongoose";

const chatConversationSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    last_message: {
      text: { type: String, default: "" },
      sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sender_name: { type: String, default: "" },
      timestamp: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ firm_id: 1, participants: 1 });

const ChatConversation = mongoose.model(
  "ChatConversation",
  chatConversationSchema
);
export default ChatConversation;

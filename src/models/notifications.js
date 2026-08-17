import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String, // "form_submission", "form_action", "leave_submission", "leave_action"
    required: true,
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notifications = mongoose.model("Notification", notificationSchema);
export default Notifications;

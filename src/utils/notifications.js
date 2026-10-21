import Notifications from "../models/notifications.js";

export const createNotification = async (userId, title, message, type, referenceId = null) => {
  try {
    const notification = new Notifications({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId,
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
  }
};

import Notifications from "../models/notifications.js";

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notifications = await Notifications.find({ user_id: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notifications.findByIdAndUpdate(id, { is_read: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await Notifications.updateMany({ user_id: userId, is_read: false }, { is_read: true });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await Notifications.deleteMany({ user_id: userId });
    res.status(200).json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

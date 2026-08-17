import Users from "../models/users.js";

// ✅ 1. Get Profile
export const getProfile = async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).select("-user_password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).send(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 2. Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { user_fullname, user_email, user_designation } = req.body;

    const updatedUser = await Users.findByIdAndUpdate(
      req.params.id,
      {
        user_fullname,
        user_email,
        user_designation,
      },
      { new: true }
    ).select("-user_password");

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 3. Upload Profile Image
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imagePath = `http://localhost:5000/uploads/${req.file.filename}`;

    const user = await Users.findByIdAndUpdate(
      req.params.id,
      { user_image: imagePath },
      { new: true }
    );

    res.status(200).json({
      message: "Image uploaded successfully",
      image: user.user_image,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 4. Change Password (NO BCRYPT)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await Users.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check current password
    if (user.user_password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // ✅ Check new password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ Optional: prevent same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password cannot be same as current password",
      });
    }

    // ✅ Update password (plain text)
    user.user_password = newPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
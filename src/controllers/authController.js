import Users from "../models/users.js";
import Firm from "../models/Firm.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  getClientIp,
  recordFailedLogin,
  resetLoginAttempts,
  normalizeIdentifier,
} from "../middleware/rateLimiter.js";

// Step 1: Pre-validation for username/employee code
export const preValidateUser = async (req, res) => {
  try {
    const { user_code } = req.body;
    if (!user_code || !user_code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your employee code or username",
      });
    }

    // Step 1 purposefully does not disclose if account exists
    // to prevent user enumeration attacks
    return res.status(200).json({
      success: true,
      message: "Identifier accepted. Please provide password.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Step 2: Complete Authentication with Rate Limiting & Bcrypt
export const login = async (req, res) => {
  try {
    const { user_code, user_password } = req.body;
    const ip = getClientIp(req);

    if (!user_code || !user_password) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee code and password",
      });
    }

    const normalizedCode = normalizeIdentifier(user_code);

    // Find user by code (case-insensitive search)
    const user = await Users.findOne({
      user_code: { $regex: new RegExp(`^${normalizedCode}$`, "i") },
    });

    if (!user) {
      await recordFailedLogin(normalizedCode, ip);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please verify your employee code and password.",
      });
    }

    // Check password (supports bcrypt hash or legacy plain text, and auto-hashes on match)
    let isMatch = false;
    if (
      user.user_password &&
      (user.user_password.startsWith("$2a$") || user.user_password.startsWith("$2b$"))
    ) {
      isMatch = await bcrypt.compare(user_password, user.user_password);
    } else {
      isMatch = user.user_password === user_password;
      // Upgrade plain text to secure bcrypt hash automatically
      if (isMatch) {
        user.user_password = await bcrypt.hash(user_password, 10);
        await user.save();
      }
    }

    if (!isMatch) {
      const attemptsCount = await recordFailedLogin(normalizedCode, ip);
      const remainingAttempts = Math.max(0, 3 - attemptsCount);
      const warningMsg =
        remainingAttempts > 0
          ? `Invalid credentials. ${remainingAttempts} attempt${remainingAttempts > 1 ? "s" : ""} remaining before account is temporarily locked.`
          : "Invalid credentials. Account is now temporarily locked.";

      return res.status(401).json({
        success: false,
        message: warningMsg,
        remainingAttempts,
      });
    }

    // Authentication succeeded: reset rate limit attempts
    await resetLoginAttempts(normalizedCode, ip);

    // Fetch user's firm details
    let firmData = null;
    if (user.firm_id) {
      firmData = await Firm.findById(user.firm_id);
    }
    if (!firmData) {
      firmData = await Firm.findOne();
      if (firmData && !user.firm_id) {
        user.firm_id = firmData._id;
        await user.save();
      }
    }

    // Generate JWT Token with firm_id & user_code
    const token = jwt.sign(
      {
        user_id: user._id,
        user_code: user.user_code,
        user_role: user.user_role,
        user_designation: user.user_designation,
        firm_id: user.firm_id || firmData?._id,
      },
      process.env.JWT_SECRET || "supersecretkeyforstrativaerp",
      { expiresIn: "1d" }
    );

    // Successful login response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      loggedUser: {
        user_id: user._id,
        user_fullname: user.user_fullname,
        user_email: user.user_email,
        user_code: user.user_code,
        user_role: user.user_role,
        user_designation: user.user_designation,
        user_image: user.user_image,
        is_manager: user.is_manager,
        must_change_password: user.must_change_password || false,
        firm_id: user.firm_id || firmData?._id,
        firm_name: firmData?.firm_name || "Strativa Global",
        firm_code: firmData?.firm_code || "APEX",
      },
    });
  } catch (err) {
    console.error("Login controller error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all managers (filtered to user's firm for managers/users)
export const allManagers = async (req, res) => {
  try {
    const query = { user_role: "manager" };
    if (req.user?.firm_id) {
      query.firm_id = req.user.firm_id;
    }

    const managers = await Users.find(query);
    res.status(200).json({ success: true, allManagers: managers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
import Users from "../models/users.js";
import Employees from "../models/employees.js";
import Firm from "../models/Firm.js";
import bcrypt from "bcrypt";

// Helper to strip legacy localhost prefixes
const cleanImageUrl = (url) => {
  if (!url) return "";
  if (url.includes("http://localhost:5000/uploads/")) {
    return url.replace("http://localhost:5000/uploads/", "");
  }
  return url;
};

// 1. Get Profile with comprehensive employee & firm details
export const getProfile = async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).select("-user_password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch corresponding employee record
    const employee = await Employees.findOne({ employee_code: user.user_code });

    // Fetch firm details
    const firmId = user.firm_id || employee?.firm_id;
    let firm = null;
    if (firmId) {
      firm = await Firm.findById(firmId);
    }
    if (!firm) {
      firm = await Firm.findOne();
    }

    const cleanUserImage = cleanImageUrl(user.user_image);

    const profileData = {
      _id: user._id,
      user_fullname: user.user_fullname,
      user_email: user.user_email,
      user_code: user.user_code,
      user_role: user.user_role,
      user_designation: user.user_designation,
      user_image: cleanUserImage,
      is_manager: user.is_manager,
      must_change_password: user.must_change_password || false,

      // Firm details
      firm_id: firm?._id,
      firm_name: firm?.firm_name || "Apexion Strativa Global",
      firm_code: firm?.firm_code || "APEX",

      // Extended employee fields
      employee_id: employee?._id,
      employee_phonenumber: employee?.employee_phonenumber || "",
      employee_cnicnumber: employee?.employee_cnicnumber || "",
      employee_dob: employee?.employee_dob || null,
      employee_maritalstatus: employee?.employee_maritalstatus || "Single",
      employee_department: employee?.employee_department || "",
      employee_qualification: employee?.employee_qualification || "",
      employee_lastorganization: employee?.employee_lastorganization || "",
      employee_salary: employee?.employee_salary || "0",
      salary_basis: employee?.salary_basis || "Monthly",
      employee_joiningdate: employee?.employee_joiningdate || null,
      employment_status: employee?.employment_status || "Permanent",
      assigned_shift: employee?.assigned_shift || {
        shift_name: "Standard Morning (9:00 AM - 5:00 PM)",
        start_time: "09:00 AM",
        end_time: "05:00 PM",
        expected_hours_per_day: 8.0,
      },
      bank_details: employee?.bank_details || {},
    };

    res.status(200).json(profileData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Update Profile (Protects sensitive fields: code, role, salary, firm)
export const updateProfile = async (req, res) => {
  try {
    const {
      user_fullname,
      employee_phonenumber,
      employee_maritalstatus,
      employee_qualification,
    } = req.body;

    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only update authorized user fields
    if (user_fullname && user_fullname.trim()) {
      user.user_fullname = user_fullname.trim();
      await user.save();
    }

    // Update authorized personal details in Employees
    const employee = await Employees.findOne({ employee_code: user.user_code });
    if (employee) {
      if (user_fullname && user_fullname.trim()) {
        const parts = user_fullname.trim().split(" ");
        employee.employee_fname = parts[0];
        employee.employee_lname = parts.slice(1).join(" ") || parts[0];
      }
      if (employee_phonenumber !== undefined) {
        employee.employee_phonenumber = employee_phonenumber;
      }
      if (employee_maritalstatus !== undefined) {
        employee.employee_maritalstatus = employee_maritalstatus;
      }
      if (employee_qualification !== undefined) {
        employee.employee_qualification = employee_qualification;
      }
      await employee.save();
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Upload Profile Image (Saves relative filename, avoids hardcoded localhost)
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filename = req.file.filename;

    const user = await Users.findByIdAndUpdate(
      req.params.id,
      { user_image: filename },
      { new: true }
    );

    if (user) {
      await Employees.findOneAndUpdate(
        { employee_code: user.user_code },
        { employee_image: filename }
      );
    }

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      image: filename,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Change Password (Secure Bcrypt verification & hashing)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ message: "New password must be at least 3 characters long" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password cannot be the same as current password" });
    }

    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password with bcrypt or legacy plaintext match
    let isMatch = false;
    if (
      user.user_password &&
      (user.user_password.startsWith("$2a$") || user.user_password.startsWith("$2b$"))
    ) {
      isMatch = await bcrypt.compare(currentPassword, user.user_password);
    } else {
      isMatch = user.user_password === currentPassword;
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password securely
    user.user_password = await bcrypt.hash(newPassword, 10);
    user.must_change_password = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
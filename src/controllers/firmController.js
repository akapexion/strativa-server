import Firm from "../models/Firm.js";
import Employees from "../models/employees.js";
import Users from "../models/users.js";
import bcrypt from "bcrypt";
import { sendEmployeeOnboardingEmail } from "../utils/emailService.js";

// 1. Get all firms (Admin only)
export const getAllFirms = async (req, res) => {
  try {
    const firms = await Firm.find().sort({ createdAt: -1 });

    // Include active employee count per firm
    const firmsWithCounts = await Promise.all(
      firms.map(async (f) => {
        const activeCount = await Employees.countDocuments({
          firm_id: f._id,
          employment_status: { $nin: ["Terminated", "Ex"] },
        });
        const firmObj = f.toObject();
        firmObj.active_employees_count = activeCount;
        return firmObj;
      })
    );

    res.status(200).json({
      success: true,
      firms: firmsWithCounts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Get single firm
export const getSingleFirm = async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id);
    if (!firm) {
      return res.status(404).json({ success: false, message: "Firm not found" });
    }

    const activeCount = await Employees.countDocuments({
      firm_id: firm._id,
      employment_status: { $nin: ["Terminated", "Ex"] },
    });

    res.status(200).json({
      success: true,
      firm: { ...firm.toObject(), active_employees_count: activeCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Create a new firm (Admin only)
export const createFirm = async (req, res) => {
  try {
    const {
      firm_name,
      firm_code,
      firm_email,
      firm_phone,
      firm_address,
      employee_limit,
    } = req.body;

    if (!firm_name || !firm_code || !firm_email) {
      return res.status(400).json({
        success: false,
        message: "Firm name, code, and email are required",
      });
    }

    const normalizedCode = firm_code.trim().toUpperCase();
    const existing = await Firm.findOne({ firm_code: normalizedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Firm with code "${normalizedCode}" already exists`,
      });
    }

    const newFirm = new Firm({
      firm_name: firm_name.trim(),
      firm_code: normalizedCode,
      firm_email: firm_email.trim().toLowerCase(),
      firm_phone: firm_phone || "",
      firm_address: firm_address || "",
      employee_limit: Number(employee_limit) || 50,
      status: "active",
    });

    await newFirm.save();

    // Auto-provision initial firm manager so the firm is immediately usable
    const managerName = req.body?.manager_name || `${newFirm.firm_name} Manager`;
    let managerEmail = (req.body?.manager_email || newFirm.firm_email || "").toLowerCase().trim();
    if (!managerEmail) {
      managerEmail = `manager.${normalizedCode.toLowerCase()}@strativa.internal`;
    }

    let managerCode = `${normalizedCode}-MGR01`;
    let counter = 1;
    while (await Users.findOne({ user_code: managerCode })) {
      counter++;
      managerCode = `${normalizedCode}-MGR${counter.toString().padStart(2, "0")}`;
    }

    const hashedPassword = await bcrypt.hash("123", 10);

    const initialManagerUser = new Users({
      firm_id: newFirm._id,
      user_fullname: managerName,
      user_email: managerEmail,
      user_code: managerCode,
      user_password: hashedPassword,
      user_designation: "General Manager",
      user_image: "fallback-avatar.svg",
      user_role: "manager",
      is_manager: true,
      must_change_password: true,
    });

    const initialManagerEmployee = new Employees({
      firm_id: newFirm._id,
      employee_code: managerCode,
      employee_fname: managerName.split(" ")[0] || newFirm.firm_name,
      employee_lname: managerName.split(" ").slice(1).join(" ") || "Manager",
      employee_email: managerEmail,
      employee_phonenumber: newFirm.firm_phone || "0000000000",
      employee_cnicnumber: 1000000000000 + Math.floor(Math.random() * 900000000000),
      employee_dob: new Date("1990-01-01"),
      employee_maritalstatus: "Single",
      employee_image: "fallback-avatar.svg",
      employee_designation: "General Manager",
      employee_department: "Management",
      employee_qualification: "Management",
      employee_lastorganization: newFirm.firm_name,
      is_manager: true,
      employment_status: "Active",
      salary_basis: "Monthly",
      employee_salary: "0",
      assigned_shift: {
        shift_name: "Standard Morning (9:00 AM - 5:00 PM)",
        start_time: "09:00 AM",
        end_time: "05:00 PM",
        expected_hours_per_day: 8.0,
      },
    });

    await initialManagerUser.save();
    await initialManagerEmployee.save();

    sendEmployeeOnboardingEmail({
      toEmail: managerEmail,
      employeeName: managerName,
      employeeCode: managerCode,
      firmName: newFirm.firm_name,
    }).catch((e) => console.error("Auto manager email err:", e));

    res.status(201).json({
      success: true,
      message: "Firm created successfully with initial manager credentials",
      firm: newFirm,
      manager: {
        user_code: managerCode,
        user_fullname: managerName,
        user_email: managerEmail,
        initial_password: "123",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Update firm details & employee limit (Admin only)
export const updateFirm = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firm_name,
      firm_email,
      firm_phone,
      firm_address,
      employee_limit,
      status,
    } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
      return res.status(404).json({ success: false, message: "Firm not found" });
    }

    if (firm_name) firm.firm_name = firm_name.trim();
    if (firm_email) firm.firm_email = firm_email.trim().toLowerCase();
    if (firm_phone !== undefined) firm.firm_phone = firm_phone;
    if (firm_address !== undefined) firm.firm_address = firm_address;
    if (employee_limit !== undefined) {
      const newLimit = Number(employee_limit);
      if (newLimit < 1) {
        return res.status(400).json({
          success: false,
          message: "Employee limit must be at least 1",
        });
      }
      firm.employee_limit = newLimit;
    }
    if (status && ["active", "inactive"].includes(status)) {
      firm.status = status;
    }

    await firm.save();

    res.status(200).json({
      success: true,
      message: "Firm updated successfully",
      firm,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Get current firm capacity (Accessible to Managers & Admins)
export const getFirmCapacity = async (req, res) => {
  try {
    const firmId = req.user?.firm_id || req.params.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: "Firm ID not found" });
    }

    const firm = await Firm.findById(firmId);
    if (!firm) {
      return res.status(404).json({ success: false, message: "Firm not found" });
    }

    // Active + Probation employees count toward capacity limit
    const activeCount = await Employees.countDocuments({
      firm_id: firm._id,
      employment_status: { $nin: ["Terminated", "Ex"] },
    });

    res.status(200).json({
      success: true,
      capacity: {
        firm_id: firm._id,
        firm_name: firm.firm_name,
        firm_code: firm.firm_code,
        employee_limit: firm.employee_limit,
        active_count: activeCount,
        available_slots: Math.max(0, firm.employee_limit - activeCount),
        is_at_capacity: activeCount >= firm.employee_limit,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Get or Provision Manager for an existing firm (Admin only)
export const provisionOrGetFirmManager = async (req, res) => {
  try {
    const { id } = req.params;
    const firm = await Firm.findById(id);
    if (!firm) {
      return res.status(404).json({ success: false, message: "Firm not found" });
    }

    // Check if a manager user already exists for this firm
    let manager = await Users.findOne({ firm_id: firm._id, is_manager: true });

    if (manager) {
      return res.status(200).json({
        success: true,
        message: "Existing manager account retrieved",
        isNew: false,
        manager: {
          user_fullname: manager.user_fullname,
          user_code: manager.user_code,
          user_email: manager.user_email,
          user_role: manager.user_role,
          initial_password: "123",
        },
      });
    }

    // If none exists, provision one
    const managerName = req.body?.manager_name || `${firm.firm_name} Manager`;
    let managerEmail = (req.body?.manager_email || firm.firm_email || "").toLowerCase().trim();
    if (!managerEmail) {
      managerEmail = `manager.${firm.firm_code.toLowerCase()}@strativa.internal`;
    }

    let managerCode = `${firm.firm_code}-MGR01`;
    let counter = 1;
    while (await Users.findOne({ user_code: managerCode })) {
      counter++;
      managerCode = `${firm.firm_code}-MGR${counter.toString().padStart(2, "0")}`;
    }

    const hashedPassword = await bcrypt.hash("123", 10);

    const newUser = new Users({
      firm_id: firm._id,
      user_fullname: managerName,
      user_email: managerEmail,
      user_code: managerCode,
      user_password: hashedPassword,
      user_designation: "General Manager",
      user_image: "fallback-avatar.svg",
      user_role: "manager",
      is_manager: true,
      must_change_password: true,
    });

    const newEmployee = new Employees({
      firm_id: firm._id,
      employee_code: managerCode,
      employee_fname: managerName.split(" ")[0] || firm.firm_name,
      employee_lname: managerName.split(" ").slice(1).join(" ") || "Manager",
      employee_email: managerEmail,
      employee_phonenumber: firm.firm_phone || "0000000000",
      employee_cnicnumber: 1000000000000 + Math.floor(Math.random() * 900000000000),
      employee_dob: new Date("1990-01-01"),
      employee_maritalstatus: "Single",
      employee_image: "fallback-avatar.svg",
      employee_designation: "General Manager",
      employee_department: "Management",
      employee_qualification: "Management",
      employee_lastorganization: firm.firm_name,
      is_manager: true,
      employment_status: "Active",
      salary_basis: "Monthly",
      employee_salary: "0",
      assigned_shift: {
        shift_name: "Standard Morning (9:00 AM - 5:00 PM)",
        start_time: "09:00 AM",
        end_time: "05:00 PM",
        expected_hours_per_day: 8.0,
      },
    });

    await newUser.save();
    await newEmployee.save();

    sendEmployeeOnboardingEmail({
      toEmail: managerEmail,
      employeeName: managerName,
      employeeCode: managerCode,
      firmName: firm.firm_name,
    }).catch((e) => console.error("Auto manager email err:", e));

    res.status(201).json({
      success: true,
      message: "Manager account successfully provisioned for this firm",
      isNew: true,
      manager: {
        user_fullname: managerName,
        user_code: managerCode,
        user_email: managerEmail,
        user_role: "manager",
        initial_password: "123",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

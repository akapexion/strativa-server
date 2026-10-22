import Employees from "../models/employees.js";
import Users from "../models/users.js";
import Firm from "../models/Firm.js";
import Appraisals from "../models/appraisals.js";
import DFIForms from "../models/dfi.js";
import KPIForms from "../models/kpi.js";
import CustomFormSubmission from "../models/CustomFormSubmission.js";
import { generateEmployeeCode } from "../utils/generateEmployeeCode.js";
import { sendEmployeeOnboardingEmail } from "../utils/emailService.js";
import bcrypt from "bcrypt";

export const addEmployee = async (req, res) => {
  try {
    // 1. Role Check: "Admins must not add employees through the normal employee-creation workflow."
    if (req.user?.user_role === "admin" || req.user?.user_role === 0) {
      return res.status(403).json({
        success: false,
        message:
          "Admins cannot add employees directly through this workflow. Employees must be added by firm managers.",
      });
    }

    // 2. Firm Resolution & Capacity Limit Check:
    let firmId = req.user?.firm_id;
    let firm = null;

    if (firmId) {
      firm = await Firm.findById(firmId);
    }
    if (!firm) {
      firm = await Firm.findOne();
      firmId = firm?._id;
    }

    if (!firm) {
      return res.status(400).json({
        success: false,
        message: "No active firm found. Please contact administrator.",
      });
    }

    // Active + Probation employees count towards the limit; Terminated and Ex do not.
    const activeEmployeesCount = await Employees.countDocuments({
      firm_id: firmId,
      employment_status: { $nin: ["Terminated", "Ex"] },
    });

    if (activeEmployeesCount >= firm.employee_limit) {
      return res.status(400).json({
        success: false,
        message: `Firm limit reached (${activeEmployeesCount}/${firm.employee_limit} employees). You cannot add more employees to this firm.`,
        isAtCapacity: true,
      });
    }

    const { employee_fname, employee_lname, employee_email } = req.body;
    if (!employee_fname || !employee_lname || !employee_email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    // Check if email already exists
    const existingEmp = await Employees.findOne({ employee_email });
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: "An employee with this email already exists",
      });
    }

    const fname = employee_fname.trim();
    const lname = employee_lname.trim();
    const employeeCode = generateEmployeeCode(fname, lname);

    let customLeaves = {};
    if (req.body.custom_leaves) {
      try {
        customLeaves = JSON.parse(req.body.custom_leaves);
      } catch (e) {
        console.error("Failed to parse custom_leaves:", e);
      }
    }

    let assignedShift = {
      shift_name: req.body.shift_name || "Standard Morning (9:00 AM - 5:00 PM)",
      start_time: req.body.shift_start_time || "09:00 AM",
      end_time: req.body.shift_end_time || "05:00 PM",
      expected_hours_per_day: Number(req.body.expected_hours_per_day) || 8.0,
    };

    const newEmployee = new Employees({
      firm_id: firmId,
      employee_code: employeeCode,
      employee_fname: fname,
      employee_lname: lname,
      employee_email: employee_email.trim().toLowerCase(),
      employee_phonenumber: req.body.employee_phonenumber || "",
      employee_cnicnumber: req.body.employee_cnicnumber || 0,
      employee_dob: req.body.employee_dob || new Date(),
      employee_maritalstatus: req.body.employee_maritalstatus || "Single",
      employee_department: req.body.employee_department || "",
      employee_designation: req.body.employee_designation || "",
      employee_qualification: req.body.employee_qualification || "",
      employee_lastorganization: req.body.employee_lastorganization || "",
      employee_salary: req.body.employee_salary || "0",
      salary_basis: req.body.salary_basis || "Monthly",
      assigned_shift: assignedShift,
      bank_details: {
        bank_name: req.body.bank_name || "",
        account_title: req.body.account_title || "",
        account_number: req.body.account_number || "",
        iban: req.body.iban || "",
      },
      employee_joiningdate: req.body.employee_joiningdate || new Date(),
      employee_image: req.file ? req.file.filename : "",
      is_manager: req.body.is_manager === "true" || req.body.is_manager === true,
      employment_status: req.body.employment_status || "Probation",
      alloted_leaves: {
        causual_leaves: 0,
        medical_leaves: req.body.medical_leaves ? Number(req.body.medical_leaves) : 5,
        special_leaves: req.body.special_leaves ? Number(req.body.special_leaves) : 5,
        annual_leaves: 0,
        ...customLeaves,
      },
    });

    // Initial password is "123", securely hashed via bcrypt
    const hashedPassword = await bcrypt.hash("123", 10);

    const newUser = new Users({
      firm_id: firmId,
      user_fullname: fname + " " + lname,
      user_email: employee_email.trim().toLowerCase(),
      user_code: employeeCode,
      user_password: hashedPassword,
      user_designation: req.body.employee_designation || "Staff",
      user_image: req.file ? req.file.filename : "",
      user_role: req.body.is_manager === "true" || req.body.is_manager === true ? "manager" : "user",
      is_manager: req.body.is_manager === "true" || req.body.is_manager === true,
      must_change_password: true,
    });

    await newEmployee.save();
    await newUser.save();

    // Send onboarding welcome email safely with credentials instructions
    sendEmployeeOnboardingEmail({
      toEmail: newEmployee.employee_email,
      employeeName: `${newEmployee.employee_fname} ${newEmployee.employee_lname}`,
      employeeCode: newEmployee.employee_code,
      firmName: firm.firm_name,
    }).catch((emailErr) => console.error("Onboarding email error:", emailErr));

    res.status(200).send({
      success: true,
      message: "Employee added successfully and onboarding email sent",
      data: newEmployee,
    });
  } catch (err) {
    console.error("addEmployee error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const allEmployees = async (req, res) => {
  try {
    const query = {};

    // Strict firm isolation: non-superadmin users only see employees in their firm
    if (req.user?.user_role !== "admin" && req.user?.user_role !== 0) {
      query.firm_id = req.user.firm_id;
    } else if (req.query.firm_id) {
      query.firm_id = req.query.firm_id;
    }

    const employees = await Employees.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Employees list fetched successfully",
      employees,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const fetchSingleEmployee = async (req, res) => {
  try {
    const employee = await Employees.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Firm isolation check
    if (
      req.user?.user_role !== "admin" &&
      req.user?.user_role !== 0 &&
      employee.firm_id &&
      String(employee.firm_id) !== String(req.user.firm_id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied. Employee belongs to another firm." });
    }

    res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      employee,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const existing = await Employees.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Firm isolation check
    if (
      req.user?.user_role !== "admin" &&
      req.user?.user_role !== 0 &&
      existing.firm_id &&
      String(existing.firm_id) !== String(req.user.firm_id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied. Employee belongs to another firm." });
    }

    // Protect firm_id from being mutated by managers
    const updatePayload = { ...req.body };
    if (req.user?.user_role !== "admin" && req.user?.user_role !== 0) {
      delete updatePayload.firm_id;
    }

    const updatedEmployee = await Employees.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (updatedEmployee) {
      await Users.findOneAndUpdate(
        { user_code: updatedEmployee.employee_code },
        {
          user_fullname: updatedEmployee.employee_fname + " " + updatedEmployee.employee_lname,
          user_email: updatedEmployee.employee_email,
          user_designation: updatedEmployee.employee_designation,
          is_manager: updatedEmployee.is_manager,
          user_role: updatedEmployee.is_manager ? "manager" : "user",
        }
      );
    }

    res.status(200).json({ success: true, message: "Employee updated", updatedEmployee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const existing = await Employees.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Firm isolation check
    if (
      req.user?.user_role !== "admin" &&
      req.user?.user_role !== 0 &&
      existing.firm_id &&
      String(existing.firm_id) !== String(req.user.firm_id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied. Employee belongs to another firm." });
    }

    const deletedEmployee = await Employees.findByIdAndDelete(req.params.id);
    await Users.findOneAndDelete({ user_code: existing.employee_code });

    res.status(200).json({ success: true, message: "Employee deleted", deletedEmployee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const currentEmployeeFormSubmissions = async (req, res) => {
  try {
    const code = req.params.code;
    const currentEmployeeAppraisals = await Appraisals.find({ employee_code: code });
    const currentEmployeeDFIs = await DFIForms.find({ employee_code: code });
    const currentEmployeeKPIs = await KPIForms.find({ employee_code: code });
    const customSubmissions = await CustomFormSubmission.find({ employee_code: code });

    const currentEmployeeFormSubmissions = [
      ...currentEmployeeAppraisals,
      ...currentEmployeeDFIs,
      ...currentEmployeeKPIs,
      ...customSubmissions,
    ];
    res.status(200).json({ success: true, currentEmployeeFormSubmissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const formSubmissionDetail = async (req, res) => {
  try {
    const { id } = req.params;

    let form = await Appraisals.findById(id);
    if (!form) form = await DFIForms.findById(id);
    if (!form) form = await KPIForms.findById(id);
    if (!form) form = await CustomFormSubmission.findById(id);

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    let formObj = form.toObject ? form.toObject() : form;

    const creatorUser = await Users.findOne({ user_code: form.employee_code });
    const isAuthorManager = creatorUser && (creatorUser.is_manager || creatorUser.user_role === "manager");

    if (isAuthorManager) {
      formObj.is_manager_raised = true;
      const ceo = await Users.findOne({
        $or: [{ user_role: "ceo" }, { user_designation: "CEO" }],
      });
      if (ceo) {
        formObj.ceo_user = {
          _id: ceo._id,
          user_fullname: ceo.user_fullname,
          user_designation: ceo.user_designation,
        };
      }
    }

    res.status(200).json({ success: true, formSubmission: formObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
import CustomForm from "../models/CustomForm.js";
import CustomFormSubmission from "../models/CustomFormSubmission.js";
import Employees from "../models/employees.js";
import Users from "../models/users.js";
import Appraisals from "../models/appraisals.js";
import DFIForms from "../models/dfi.js";
import KPIForms from "../models/kpi.js";
import { createNotification } from "../utils/notifications.js";

// Create a new custom form definition
export const createCustomForm = async (req, res) => {
  try {
    const { form_title, form_target_role, fields } = req.body;

    if (!form_title || !form_target_role || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: "All form fields are required" });
    }

    const newForm = new CustomForm({
      form_title,
      form_target_role,
      fields
    });

    await newForm.save();

    res.status(201).json({
      success: true,
      message: "Custom form created successfully",
      data: newForm
    });
  } catch (err) {
    console.error("Create Custom Form Error:", err);
    res.status(500).json({ success: false, message: "Server error creating custom form", error: err.message });
  }
};

// Get all custom forms (optionally filtered by logged-in user's department)
export const getCustomForms = async (req, res) => {
  try {
    const userRole = req.user?.user_role;
    const userCode = req.user?.user_code;

    let query = {};

    // If not admin, filter by user's department
    if (userRole !== "admin") {
      const employee = await Employees.findOne({ employee_code: userCode });
      const dept = employee ? employee.employee_department : "";

      if (dept) {
        query = {
          $or: [
            { form_target_role: "all" },
            { form_target_role: dept }
          ]
        };
      }
    }

    const customForms = await CustomForm.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: customForms
    });
  } catch (err) {
    console.error("Get Custom Forms Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching custom forms", error: err.message });
  }
};

// Get custom form by ID
export const getCustomFormById = async (req, res) => {
  try {
    const form = await CustomForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: "Custom form not found" });
    }
    res.status(200).json({ success: true, data: form });
  } catch (err) {
    console.error("Get Custom Form By ID Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching custom form details", error: err.message });
  }
};

// Delete a custom form definition
export const deleteCustomForm = async (req, res) => {
  try {
    const form = await CustomForm.findByIdAndDelete(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: "Custom form not found" });
    }
    res.status(200).json({ success: true, message: "Custom form deleted successfully" });
  } catch (err) {
    console.error("Delete Custom Form Error:", err);
    res.status(500).json({ success: false, message: "Server error deleting custom form", error: err.message });
  }
};

// Update an existing custom form definition
export const updateCustomForm = async (req, res) => {
  try {
    const { form_title, form_target_role, fields } = req.body;

    if (!form_title || !form_target_role || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: "All form fields are required" });
    }

    const updatedForm = await CustomForm.findByIdAndUpdate(
      req.params.id,
      { form_title, form_target_role, fields },
      { new: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ success: false, message: "Custom form not found" });
    }

    res.status(200).json({
      success: true,
      message: "Custom form updated successfully",
      data: updatedForm
    });
  } catch (err) {
    console.error("Update Custom Form Error:", err);
    res.status(500).json({ success: false, message: "Server error updating custom form", error: err.message });
  }
};

// Submit dynamic answers for a custom form
export const submitCustomForm = async (req, res) => {
  try {
    const { form_id, employee_code, employee_name, answers } = req.body;

    if (!form_id || !employee_code || !employee_name || !answers) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const formDef = await CustomForm.findById(form_id);
    if (!formDef) {
      return res.status(404).json({ success: false, message: "Form definition not found" });
    }

    const submission = new CustomFormSubmission({
      form_id,
      form_title: formDef.form_title,
      employee_code,
      employee_name,
      answers,
      form_status: "pending"
    });

    await submission.save();

    // Check if the submitter is a manager
    const submitter = await Users.findOne({ user_code: employee_code });
    const isManager = submitter && (submitter.is_manager || submitter.user_role === "manager");

    if (isManager) {
      // Notify the CEO
      const ceo = await Users.findOne({
        $or: [
          { user_role: "ceo" },
          { user_designation: "CEO" }
        ]
      });

      if (ceo) {
        await createNotification(
          ceo._id,
          "New Manager Form Pending",
          `A manager form request (${formDef.form_title}) from ${employee_name} requires your approval.`,
          "form_submission",
          submission._id
        );
      } else {
        // Fallback: Notify admin
        const admin = await Users.findOne({ user_role: "admin" });
        if (admin) {
          await createNotification(
            admin._id,
            "New Manager Form Pending (No CEO Configured)",
            `A manager form request (${formDef.form_title}) from ${employee_name} requires approval.`,
            "form_submission",
            submission._id
          );
        }
      }
    } else {
      // Normal employee submission: notify the first manager in chronological order
      const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
      if (managers.length > 0) {
        await createNotification(
          managers[0]._id,
          "New Form Pending",
          `A form request (${formDef.form_title}) from ${employee_name} requires your approval.`,
          "form_submission",
          submission._id
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      data: submission
    });
  } catch (err) {
    console.error("Submit Custom Form Error:", err);
    res.status(500).json({ success: false, message: "Server error submitting form answers", error: err.message });
  }
};

// Get all form submissions across all types for Admin
export const getAllSubmissionsForAdmin = async (req, res) => {
  try {
    const customSubmissions = await CustomFormSubmission.find().sort({ createdAt: -1 });
    const appraisalSubmissions = await Appraisals.find().sort({ createdAt: -1 });
    const dfiSubmissions = await DFIForms.find().sort({ createdAt: -1 });
    const kpiSubmissions = await KPIForms.find().sort({ createdAt: -1 });

    const allSubmissions = [
      ...customSubmissions,
      ...appraisalSubmissions,
      ...dfiSubmissions,
      ...kpiSubmissions,
    ];

    allSubmissions.sort((a, b) => new Date(b.createdAt || (b._id && b._id.getTimestamp ? b._id.getTimestamp() : 0)) - new Date(a.createdAt || (a._id && a._id.getTimestamp ? a._id.getTimestamp() : 0)));

    res.status(200).json({
      success: true,
      data: allSubmissions
    });
  } catch (err) {
    console.error("Get All Submissions For Admin Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching all submissions", error: err.message });
  }
};


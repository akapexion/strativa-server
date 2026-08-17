import Employees from "../models/employees.js";
import Users from "../models/users.js";
import Appraisals from "../models/appraisals.js";
import DFIForms from "../models/dfi.js";
import KPIForms from "../models/kpi.js";
import CustomFormSubmission from "../models/CustomFormSubmission.js";
import { generateEmployeeCode } from "../utils/generateEmployeeCode.js";

export const addEmployee = async (req, res) => {
  try {
    const { employee_fname, employee_lname, employee_email } = req.body;

    const fname = req.body.employee_fname || "";
    const lname = req.body.employee_lname || "";
    const employeeCode = generateEmployeeCode(fname, lname);

    let customLeaves = {};
    if (req.body.custom_leaves) {
      try {
        customLeaves = JSON.parse(req.body.custom_leaves);
      } catch (e) {
        console.error("Failed to parse custom_leaves:", e);
      }
    }

    const newEmployee = new Employees({
      employee_code: employeeCode,
      employee_fname: req.body.employee_fname,
      employee_lname: req.body.employee_lname,
      employee_email: req.body.employee_email,
      employee_phonenumber: req.body.employee_phonenumber,
      employee_cnicnumber: req.body.employee_cnicnumber,
      employee_dob: req.body.employee_dob,
      employee_maritalstatus: req.body.employee_maritalstatus,
      employee_department: req.body.employee_department,
      employee_designation: req.body.employee_designation,
      employee_qualification: req.body.employee_qualification,
      employee_lastorganization: req.body.employee_lastorganization,
      employee_salary: req.body.employee_salary,
      employee_joiningdate: req.body.employee_joiningdate,
      employee_image: req.file ? req.file.filename : "",
      is_manager: req.body.is_manager,
      employment_status: req.body.employment_status || "Probation",
      alloted_leaves: {
        causual_leaves: 0,
        medical_leaves: req.body.medical_leaves ? Number(req.body.medical_leaves) : 5,
        special_leaves: req.body.special_leaves ? Number(req.body.special_leaves) : 5,
        annual_leaves: 0,
        ...customLeaves
      }
    });

    const newUser = new Users({
      user_fullname: employee_fname + " " + employee_lname,
      user_email: employee_email,
      user_code: employeeCode,
      user_designation: req.body.employee_designation,
      user_image: req.file ? req.file.filename : "",
      user_role: req.body.is_manager === "true" ? "manager" : "user",
      is_manager: req.body.is_manager
    });

    await newEmployee.save();
    await newUser.save();

    res.status(200).send({
      success: true,
      message: "Employee added successfully",
      data: newEmployee,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const allEmployees = async (req, res) => {
  try {
    const employees = await Employees.find().sort({ createdAt: -1 });
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

    console.log(employee);

    res.status(200).json({ 
        success: true, 
        message: "Employees list fetched successfully", 
        employee
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async(req, res) => {
   try {
    const updatedEmployee = await Employees.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (updatedEmployee) {
      await Users.findOneAndUpdate(
        { user_code: updatedEmployee.employee_code },
        {
          user_fullname: updatedEmployee.employee_fname + " " + updatedEmployee.employee_lname,
          user_email: updatedEmployee.employee_email,
          user_designation: updatedEmployee.employee_designation,
          is_manager: updatedEmployee.is_manager,
          user_role: updatedEmployee.is_manager ? "manager" : "user"
        }
      );
    }
    
    res.status(200).json({ success: true, message: "Employee updated", updatedEmployee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const deleteEmployee = async(req, res) => {
   try {
    const deletedEmployee = await Employees.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Employee deleted", deletedEmployee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const currentEmployeeFormSubmissions = async(req, res) => {
   try {
    const currentEmployeeAppraisals = await Appraisals.find({employee_code: req.params.code});
    const currentEmployeeDFIs = await DFIForms.find({employee_code: req.params.code});
    const currentEmployeeKPIs = await KPIForms.find({employee_code: req.params.code});
    const customSubmissions = await CustomFormSubmission.find({employee_code: req.params.code});

    const currentEmployeeFormSubmissions = [...currentEmployeeAppraisals, ...currentEmployeeDFIs, ...currentEmployeeKPIs, ...customSubmissions];
    res.status(200).json({ success: true, currentEmployeeFormSubmissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

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

    // Check if creator is a manager
    const creatorUser = await Users.findOne({ user_code: form.employee_code });
    const isAuthorManager = creatorUser && (creatorUser.is_manager || creatorUser.user_role === "manager");

    if (isAuthorManager) {
      formObj.is_manager_raised = true;
      const ceo = await Users.findOne({
        $or: [
          { user_role: "ceo" },
          { user_designation: "CEO" }
        ]
      });
      if (ceo) {
        formObj.ceo_user = {
          _id: ceo._id,
          user_fullname: ceo.user_fullname,
          user_designation: ceo.user_designation
        };
      }
    }

    res.status(200).json({ success: true, formSubmission: formObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
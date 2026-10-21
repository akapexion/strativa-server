import Appraisals from "../models/appraisals.js";
import Employees from "../models/employees.js";
import Users from "../models/users.js";
import { createNotification } from "../utils/notifications.js";

export const raiseAppraisal = async (req, res) => {
  try {
    const {
      employee_code,
      employee_name,
      joining_date,
      lastincrement_date,
      achievements,
      sep_qualification,
    } = req.body;

    const newAppraisal = new Appraisals({
      employee_code,
      employee_name,
      appraisal_joining_date: joining_date,
      appraisal_lastincrement_date: lastincrement_date,
      appraisal_achievements: achievements,
      appraisal_sep_qualification: sep_qualification,
    });

    await newAppraisal.save();

    // Notify the first manager in chronological order
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    if (managers.length > 0) {
      await createNotification(
        managers[0]._id,
        "New Appraisal Form Pending",
        `An appraisal request from ${employee_name} requires your approval.`,
        "form_submission",
        newAppraisal._id
      );
    }

    res.status(200).send({
      success: true,
      message: "Appraisal submitted successfully",
      data: newAppraisal,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getMyAppraisals = async (req, res) => {
  try {

    const appraisals = await Appraisals.find({employee_code: req.params.code});

    res.status(200).json({
      success: true,
      data: appraisals,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
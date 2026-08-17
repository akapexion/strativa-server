import KPIForms from "../models/kpi.js";
import Users from "../models/users.js";
import { createNotification } from "../utils/notifications.js";

export const raiseKPI = async (req, res) => {
  try {
    const {
      employee_code,
      employee_name,
      kpi_batch,
      kpi_batch_semester,
      kpi_do_count,
      kpi_batch_attendence_percentage,
    } = req.body;

    // 🔹 Validation
    if (
      !employee_code ||
      !employee_name ||
      !kpi_batch ||
      !kpi_batch_semester ||
      kpi_do_count === undefined ||
      !kpi_batch_attendence_percentage
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Create
    const newKPI = new KPIForms({
      employee_code,
      employee_name,
      kpi_batch,
      kpi_batch_semester,
      kpi_do_count,
      kpi_batch_attendence_percentage,
    });

    await newKPI.save();

    // Notify the first manager in chronological order
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    if (managers.length > 0) {
      await createNotification(
        managers[0]._id,
        "New KPI Form Pending",
        `A KPI request from ${employee_name} requires your approval.`,
        "form_submission",
        newKPI._id
      );
    }

    res.status(201).json({
      success: true,
      message: "KPI submitted successfully",
      data: newKPI,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while submitting KPI",
    });
  }
};

export const getMyKPIs = async (req, res) => {
  try {
    const data = await KPIForms.find({ employee_code: req.params.code });

    res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching KPI data",
    });
  }
};
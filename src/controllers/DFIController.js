import DFIForms from "../models/dfi.js"; 
import Users from "../models/users.js";
import { createNotification } from "../utils/notifications.js";

export const raiseDFI = async (req, res) => {
  try {
    const {
      employee_code,
      employee_name,
      dfi_alternate_count,
      dfi_amount,
    } = req.body;

    // 🔹 Basic Validation
    if (
      !employee_code ||
      !employee_name ||
      dfi_alternate_count === undefined ||
      dfi_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Create new DFI
    const newDFI = new DFIForms({
      employee_code,
      employee_name,
      dfi_alternate_count,
      dfi_amount,
    });

    await newDFI.save();

    // Notify the first manager in chronological order
    const managers = await Users.find({ user_role: "manager" }).sort({ _id: 1 });
    if (managers.length > 0) {
      await createNotification(
        managers[0]._id,
        "New DFI Form Pending",
        `A DFI request from ${employee_name} requires your approval.`,
        "form_submission",
        newDFI._id
      );
    }

    return res.status(201).json({
      success: true,
      message: "DFI raised successfully",
      data: newDFI,
    });

  } catch (err) {
    console.error("DFI Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while raising DFI",
      error: err.message,
    });
  }
};


export const getMyDFIs = async (req, res) => {
  try {

    const dfis = await DFIForms.find({employee_code: req.params.code});

    res.status(200).json({
      success: true,
      data: dfis,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
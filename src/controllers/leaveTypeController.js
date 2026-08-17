import LeaveTypes from "../models/leavetypes.js";

export const addLeaveType = async (req, res) => {
  try {
    const { type, quantity } = req.body;

    if (!type || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Both fields are required",
      });
    }

    const newLeaveType = new LeaveTypes({
      leave_type_title: type,
      leave_type_annual_quantity: quantity,
    });

    await newLeaveType.save();

    res.status(201).json({
      success: true,
      message: "Leave Type added successfully",
      data: newLeaveType,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveTypes.find();

    res.status(200).json({
      success: true,
      leave_types: types,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity } = req.body;

    if (!type || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Both fields are required",
      });
    }

    const updated = await LeaveTypes.findByIdAndUpdate(
      id,
      {
        leave_type_title: type,
        leave_type_annual_quantity: Number(quantity),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Leave Type not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leave Type updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LeaveTypes.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Leave Type not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leave Type deleted successfully",
      data: deleted,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
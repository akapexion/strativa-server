import mongoose from "mongoose";

const appraisalsModel = new mongoose.Schema({
  form_no: {
    type: String,
    unique: true,
    default: () => `FORM-${Math.floor(Math.random() * 1000)}`,
  },

  employee_code: {
    type: String,
    required: true,
  },

  employee_name: {
    type: String,
    required: true,
  },

  appraisal_joining_date: Date,
  appraisal_lastincrement_date: Date,
  appraisal_achievements: String,

  appraisal_sep_qualification: {
    type: String,
    enum: ["Yes", "No"],
    default: "No",
  },

  form_title: {
    type: String,
    default: "Annual Appraisal",
  },

  form_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  manager_remarks: [
    {
      manager_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      manager_name: String,
      manager_designation: { type: String, default: "" },
      remark: String,
      status: {
        type: String,
        enum: ["approved", "rejected"],
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  approvers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Appraisals = mongoose.model("Appraisal", appraisalsModel);
export default Appraisals;

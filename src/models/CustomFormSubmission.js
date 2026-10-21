import mongoose from "mongoose";

const CustomFormSubmissionSchema = new mongoose.Schema({
  form_id: { type: mongoose.Schema.Types.ObjectId, ref: "CustomForm", required: true },
  form_no: {
    type: String,
    unique: true,
    default: () => `FORM-${Math.floor(1000 + Math.random() * 9000)}`
  },
  form_title: { type: String, required: true },
  employee_code: { type: String, required: true },
  employee_name: { type: String, required: true },
  form_status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  answers: {
    type: Map,
    of: String
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
    }
  ]
}, { timestamps: true });

const CustomFormSubmission = mongoose.model("CustomFormSubmission", CustomFormSubmissionSchema);
export default CustomFormSubmission;

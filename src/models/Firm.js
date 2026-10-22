import mongoose from "mongoose";

const firmSchema = new mongoose.Schema(
  {
    firm_name: {
      type: String,
      required: true,
      trim: true,
    },
    firm_code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    firm_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    firm_phone: {
      type: String,
      default: "",
    },
    firm_address: {
      type: String,
      default: "",
    },
    firm_logo: {
      type: String,
      default: "",
    },
    employee_limit: {
      type: Number,
      required: true,
      default: 50,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Firm = mongoose.model("Firm", firmSchema);
export default Firm;

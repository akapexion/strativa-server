import mongoose from "mongoose";

const attendanceRawPunchSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true,
    },
    employee_code: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    device_id: {
      type: String,
      default: "MANUAL_OR_IMPORT",
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    date_str: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    punch_type: {
      type: String,
      enum: ["CHECK_IN", "CHECK_OUT", "AUTO"],
      default: "AUTO",
    },
    verification_mode: {
      type: String,
      enum: ["FINGERPRINT", "FACE", "RFID", "PIN", "MANUAL", "CSV_IMPORT"],
      default: "CSV_IMPORT",
    },
    raw_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processed_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate punches from physical machines or repeated imports
attendanceRawPunchSchema.index(
  { firm_id: 1, employee_code: 1, timestamp: 1 },
  { unique: true }
);

const AttendanceRawPunch = mongoose.model(
  "AttendanceRawPunch",
  attendanceRawPunchSchema
);
export default AttendanceRawPunch;

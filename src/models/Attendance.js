import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      index: true,
    },
    employee_code: { type: String, required: true, index: true },
    employee_name: { type: String, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    check_in: { type: String, default: "" },
    check_out: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Half Day", "On Leave", "Incomplete"],
      default: "Present",
    },
    work_hours: { type: String, default: "0 hrs" },
    scheduled_hours: { type: String, default: "8.0 hrs" },
    punch_source: {
      type: String,
      enum: ["web", "machine", "import", "manual"],
      default: "web",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ firm_id: 1, employee_code: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;

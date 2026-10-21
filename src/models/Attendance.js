import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    employee_code: { type: String, required: true },
    employee_name: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    check_in: { type: String, default: "" },
    check_out: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Half Day", "On Leave"],
      default: "Present",
    },
    work_hours: { type: String, default: "0 hrs" },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employee_code: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;

import Attendance from "../../models/Attendance.js";
import AttendanceRawPunch from "../../models/AttendanceRawPunch.js";
import Employees from "../../models/employees.js";

// Format 12-hour AM/PM string
export const formatTimeString = (dateObj) => {
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Format YYYY-MM-DD
export const formatDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Process raw punch into daily aggregated Attendance record
 */
export const processDailyAttendanceForEmployee = async (firmId, employeeCode, dateStr) => {
  // 1. Fetch all raw punches for this employee on this date
  const punches = await AttendanceRawPunch.find({
    firm_id: firmId,
    employee_code: employeeCode,
    date_str: dateStr,
  }).sort({ timestamp: 1 });

  if (punches.length === 0) return null;

  // 2. Fetch employee profile to know shift & name
  const employee = await Employees.findOne({ employee_code: employeeCode, firm_id: firmId });
  const employeeName = employee
    ? `${employee.employee_fname} ${employee.employee_lname}`
    : punches[0].raw_payload?.employee_name || "Employee";

  const shiftStartStr = employee?.assigned_shift?.start_time || "09:00 AM";
  const expectedHours = employee?.assigned_shift?.expected_hours_per_day || 8.0;

  // 3. Determine earliest punch (Check-In) and latest punch (Check-Out)
  const firstPunch = punches[0];
  const lastPunch = punches.length > 1 ? punches[punches.length - 1] : null;

  const checkInTimeStr = formatTimeString(new Date(firstPunch.timestamp));
  let checkOutTimeStr = lastPunch ? formatTimeString(new Date(lastPunch.timestamp)) : "";

  // If first punch and last punch are within 2 minutes of each other, consider check-out missing (accidental double punch)
  if (lastPunch && lastPunch.timestamp.getTime() - firstPunch.timestamp.getTime() < 2 * 60 * 1000) {
    checkOutTimeStr = "";
  }

  // 4. Determine status & calculate duration
  let status = "Present";
  let workHours = "0 hrs";

  // Check late arrival (e.g. check-in after 9:30 AM)
  const inDate = new Date(firstPunch.timestamp);
  const lateCutoff = new Date(inDate);
  const [shHour, shMin] = shiftStartStr.replace(/[^0-9:]/g, "").split(":").map(Number);
  const isPM = shiftStartStr.toUpperCase().includes("PM") && shHour < 12;
  lateCutoff.setHours((isPM ? shHour + 12 : shHour), shMin + 30, 0, 0);

  if (inDate > lateCutoff) {
    status = "Late";
  }

  // Handle missing punch
  if (!checkOutTimeStr) {
    status = "Incomplete";
    workHours = "—"; // Never assume or compute a fake 8 hours when punch is missing!
  } else {
    // Both punches exist, compute actual working duration
    const diffMs = new Date(lastPunch.timestamp).getTime() - inDate.getTime();
    const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
    workHours = `${diffHrs.toFixed(1)} hrs`;

    if (diffHrs < expectedHours / 2) {
      status = "Half Day";
    }
  }

  // 5. Update or create daily Attendance document
  let attendanceRecord = await Attendance.findOne({
    firm_id: firmId,
    employee_code: employeeCode,
    date: dateStr,
  });

  if (!attendanceRecord) {
    attendanceRecord = new Attendance({
      firm_id: firmId,
      employee_code: employeeCode,
      employee_name: employeeName,
      date: dateStr,
      check_in: checkInTimeStr,
      check_out: checkOutTimeStr,
      status,
      work_hours: workHours,
      scheduled_hours: `${expectedHours.toFixed(1)} hrs`,
      punch_source: punches[0].verification_mode === "CSV_IMPORT" ? "import" : "machine",
    });
  } else {
    attendanceRecord.check_in = checkInTimeStr;
    attendanceRecord.check_out = checkOutTimeStr;
    attendanceRecord.status = status;
    attendanceRecord.work_hours = workHours;
    attendanceRecord.scheduled_hours = `${expectedHours.toFixed(1)} hrs`;
  }

  await attendanceRecord.save();

  // Mark raw punches as processed
  await AttendanceRawPunch.updateMany(
    { _id: { $in: punches.map((p) => p._id) } },
    { $set: { processed: true, processed_at: new Date() } }
  );

  return attendanceRecord;
};

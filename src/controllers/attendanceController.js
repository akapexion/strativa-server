import Attendance from "../models/Attendance.js";
import Employees from "../models/employees.js";

// Helper to get formatted date string YYYY-MM-DD
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to format current time string (e.g. "09:15 AM")
const getTimeString = (dateObj = new Date()) => {
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Check-in for today
export const checkIn = async (req, res) => {
  try {
    const userCode = req.body.employee_code;
    const userName = req.user?.user_fullname || req.body.employee_name || "Employee";

    if (!userCode) {
      return res.status(400).json({ success: false, message: "User code not found in request" });
    }

    const todayStr = getTodayDateString();
    const now = new Date();
    const checkInTimeStr = getTimeString(now);

    // Determine status: Late if check in is after 9:30 AM
    const lateCutoff = new Date();
    lateCutoff.setHours(9, 30, 0, 0);
    const initialStatus = now > lateCutoff ? "Late" : "Present";

    let record = await Attendance.findOne({ employee_code: userCode, date: todayStr });

    if (record) {
      if (record.check_in) {
        return res.status(400).json({ success: false, message: "Already checked in today", data: record });
      }
      record.check_in = checkInTimeStr;
      record.status = initialStatus;
      await record.save();
    } else {
      record = new Attendance({
        employee_code: userCode,
        employee_name: userName,
        date: todayStr,
        check_in: checkInTimeStr,
        status: initialStatus,
      });
      await record.save();
    }

    res.status(200).json({ success: true, message: `Checked in successfully (${initialStatus})`, data: record });
  } catch (err) {
    console.error("CheckIn Error:", err);
    res.status(500).json({ success: false, message: "Server error during check-in", error: err.message });
  }
};

// Check-out for today
export const checkOut = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    if (!userCode) {
      return res.status(400).json({ success: false, message: "User code not found in request" });
    }

    const todayStr = getTodayDateString();
    const now = new Date();
    const checkOutTimeStr = getTimeString(now);

    let record = await Attendance.findOne({ employee_code: userCode, date: todayStr });
    if (!record || !record.check_in) {
      return res.status(400).json({ success: false, message: "You have not checked in today yet" });
    }

    record.check_out = checkOutTimeStr;

    // Estimate work hours
    try {
      const inDate = new Date(`${todayStr} ${record.check_in}`);
      const diffMs = now - inDate;
      const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(1);
      record.work_hours = `${diffHrs > 0 ? diffHrs : 0.5} hrs`;
    } catch {
      record.work_hours = "8.0 hrs";
    }

    await record.save();

    res.status(200).json({ success: true, message: "Checked out successfully", data: record });
  } catch (err) {
    console.error("CheckOut Error:", err);
    res.status(500).json({ success: false, message: "Server error during check-out", error: err.message });
  }
};

// Get personal attendance records for logged in user
export const getMyAttendance = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    const records = await Attendance.find({ employee_code: userCode }).sort({ date: -1 });

    const todayStr = getTodayDateString();
    const todayRecord = records.find((r) => r.date === todayStr) || null;

    res.status(200).json({
      success: true,
      data: records,
      todayRecord,
    });
  } catch (err) {
    console.error("Get My Attendance Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching attendance", error: err.message });
  }
};

// Get team attendance records for Manager & Admin
export const getTeamAttendance = async (req, res) => {
  try {
    const { date, department } = req.query;
    const todayStr = date || getTodayDateString();

    // Get all registered employees
    const allEmployees = await Employees.find();
    let query = { date: todayStr };

    const attendanceRecords = await Attendance.find(query);
    const attendanceMap = {};
    attendanceRecords.forEach((r) => {
      attendanceMap[r.employee_code] = r;
    });

    // Combine employee list with their attendance record for the date
    let teamData = allEmployees.map((emp) => {
      const fullname = `${emp.employee_fname} ${emp.employee_lname}`;
      const rec = attendanceMap[emp.employee_code];
      return {
        employee_code: emp.employee_code,
        employee_name: fullname,
        employee_department: emp.employee_department,
        employee_designation: emp.employee_designation,
        date: todayStr,
        check_in: rec ? rec.check_in : "",
        check_out: rec ? rec.check_out : "",
        status: rec ? rec.status : "Absent",
        work_hours: rec ? rec.work_hours : "0 hrs",
        remarks: rec ? rec.remarks : "",
        _id: rec ? rec._id : null,
      };
    });

    if (department) {
      teamData = teamData.filter((emp) => emp.employee_department === department);
    }

    res.status(200).json({
      success: true,
      data: teamData,
      date: todayStr,
    });
  } catch (err) {
    console.error("Get Team Attendance Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching team attendance", error: err.message });
  }
};

// Manually mark/adjust attendance record
export const markManualAttendance = async (req, res) => {
  try {
    const { employee_code, employee_name, date, status, check_in, check_out, remarks } = req.body;

    if (!employee_code || !date || !status) {
      return res.status(400).json({ success: false, message: "Employee code, date, and status are required" });
    }

    let record = await Attendance.findOne({ employee_code, date });

    if (record) {
      record.status = status;
      if (check_in !== undefined) record.check_in = check_in;
      if (check_out !== undefined) record.check_out = check_out;
      if (remarks !== undefined) record.remarks = remarks;
      await record.save();
    } else {
      record = new Attendance({
        employee_code,
        employee_name: employee_name || "Employee",
        date,
        status,
        check_in: check_in || "",
        check_out: check_out || "",
        remarks: remarks || "",
      });
      await record.save();
    }

    res.status(200).json({ success: true, message: "Attendance record updated successfully", data: record });
  } catch (err) {
    console.error("Mark Manual Attendance Error:", err);
    res.status(500).json({ success: false, message: "Server error updating attendance", error: err.message });
  }
};

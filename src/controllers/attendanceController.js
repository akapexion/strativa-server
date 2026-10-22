import Attendance from "../models/Attendance.js";
import Employees from "../models/employees.js";
import CsvImportProvider from "../services/attendance/CsvImportProvider.js";

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
    const userCode = req.user?.user_code || req.body.employee_code;
    const userName = req.user?.user_fullname || req.body.employee_name || "Employee";
    const firmId = req.user?.firm_id;

    if (!userCode) {
      return res.status(400).json({ success: false, message: "User code not found in request" });
    }

    const todayStr = getTodayDateString();
    const now = new Date();
    const checkInTimeStr = getTimeString(now);

    // Determine status: Late if check in is after 9:30 AM (or shift start + 30 mins)
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
      record.work_hours = "—"; // Missing check-out, do not calculate fake hours
      if (firmId && !record.firm_id) record.firm_id = firmId;
      await record.save();
    } else {
      record = new Attendance({
        firm_id: firmId,
        employee_code: userCode,
        employee_name: userName,
        date: todayStr,
        check_in: checkInTimeStr,
        status: initialStatus,
        work_hours: "—",
        scheduled_hours: "8.0 hrs",
        punch_source: "web",
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
    const userCode = req.user?.user_code || req.body.employee_code;
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

    // Calculate actual working hours accurately using check-in timestamp
    try {
      // Parse check-in time components
      const match = record.check_in.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i);
      if (match) {
        let [_, h, m, meridiem] = match;
        let hours = parseInt(h, 10);
        const mins = parseInt(m, 10);
        if (meridiem.toUpperCase() === "PM" && hours < 12) hours += 12;
        if (meridiem.toUpperCase() === "AM" && hours === 12) hours = 0;

        const checkInDate = new Date();
        checkInDate.setHours(hours, mins, 0, 0);

        const diffMs = now.getTime() - checkInDate.getTime();
        const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
        record.work_hours = `${diffHrs.toFixed(1)} hrs`;

        if (diffHrs < 4.0 && record.status !== "Late") {
          record.status = "Half Day";
        }
      } else {
        record.work_hours = "8.0 hrs";
      }
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

// Get personal attendance records with date filtering & pagination (Strictly self-scoped)
export const getMyAttendance = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    if (!userCode) {
      return res.status(401).json({ success: false, message: "User authentication missing user code" });
    }

    const { startDate, endDate, page = 1, limit = 15 } = req.query;

    const query = { employee_code: userCode };
    if (req.user?.firm_id) {
      query.firm_id = req.user.firm_id;
    }

    // Backend Date Range Filter Validation
    if (startDate && endDate) {
      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [totalRecords, records] = await Promise.all([
      Attendance.countDocuments(query),
      Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limitNum),
    ]);

    const todayStr = getTodayDateString();
    const todayRecord = await Attendance.findOne({ employee_code: userCode, date: todayStr });

    res.status(200).json({
      success: true,
      data: records,
      todayRecord,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("Get My Attendance Error:", err);
    res.status(500).json({ success: false, message: "Server error fetching attendance", error: err.message });
  }
};

// Get team attendance records for Manager & Admin within their firm
export const getTeamAttendance = async (req, res) => {
  try {
    const { date, department, startDate, endDate } = req.query;
    const todayStr = date || getTodayDateString();

    const empQuery = {};
    if (req.user?.user_role !== "admin" && req.user?.user_role !== 0) {
      empQuery.firm_id = req.user.firm_id;
    } else if (req.query.firm_id) {
      empQuery.firm_id = req.query.firm_id;
    }

    const allEmployees = await Employees.find(empQuery);

    let attQuery = { date: todayStr };
    if (empQuery.firm_id) {
      attQuery.firm_id = empQuery.firm_id;
    }

    const attendanceRecords = await Attendance.find(attQuery);
    const attendanceMap = {};
    attendanceRecords.forEach((r) => {
      attendanceMap[r.employee_code] = r;
    });

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
        scheduled_hours: rec?.scheduled_hours || "8.0 hrs",
        punch_source: rec?.punch_source || "manual",
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

    const firmId = req.user?.firm_id;

    let record = await Attendance.findOne({ employee_code, date });

    if (record) {
      record.status = status;
      if (check_in !== undefined) record.check_in = check_in;
      if (check_out !== undefined) record.check_out = check_out;
      if (remarks !== undefined) record.remarks = remarks;
      if (!record.check_out && record.check_in) {
        record.work_hours = "—";
        if (record.status !== "Absent" && record.status !== "On Leave") {
          record.status = "Incomplete";
        }
      }
      await record.save();
    } else {
      record = new Attendance({
        firm_id: firmId,
        employee_code,
        employee_name: employee_name || "Employee",
        date,
        status,
        check_in: check_in || "",
        check_out: check_out || "",
        work_hours: check_in && check_out ? "8.0 hrs" : "—",
        punch_source: "manual",
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

// Import attendance punches from CSV (Machine export or manual sheet)
export const importAttendancePunches = async (req, res) => {
  try {
    let csvString = req.body.csv_data;
    if (req.file) {
      csvString = req.file.buffer ? req.file.buffer.toString("utf-8") : "";
    }

    if (!csvString || !csvString.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file or provide csv_data in request",
      });
    }

    const firmId = req.user?.firm_id;
    if (!firmId) {
      return res.status(400).json({ success: false, message: "Firm association required to import punches" });
    }

    const summary = await CsvImportProvider.importPunches(firmId, csvString);

    res.status(200).json({
      success: true,
      message: `Successfully processed ${summary.insertedPunches} punches (${summary.duplicatesSkipped} duplicates skipped).`,
      summary,
    });
  } catch (err) {
    console.error("Attendance CSV Import Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

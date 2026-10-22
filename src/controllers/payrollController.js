import PayrollRecord from "../models/PayrollRecord.js";
import Employees from "../models/employees.js";
import Attendance from "../models/Attendance.js";
import Firm from "../models/Firm.js";
import { buildPayslipPdf, convertNumberToWords } from "../utils/pdfPayslipGenerator.js";

// Helper to calculate payroll figures for an employee in a given month
export const calculateEmployeePayroll = async (firmId, employee, period) => {
  // period format: "YYYY-MM", e.g. "2026-07"
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[month - 1] || "July";

  // Days in month
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Fetch all attendance records for this employee in this month
  const dateRegex = new RegExp(`^${period}`);
  const attendanceRecords = await Attendance.find({
    firm_id: firmId,
    employee_code: employee.employee_code,
    date: { $regex: dateRegex },
  });

  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let workedHours = 0;

  attendanceRecords.forEach((rec) => {
    if (rec.status === "Present" || rec.status === "Late") {
      presentDays++;
      const hrs = parseFloat(rec.work_hours) || 8.0;
      workedHours += hrs;
    } else if (rec.status === "Half Day") {
      presentDays += 0.5;
      absentDays += 0.5;
      const hrs = parseFloat(rec.work_hours) || 4.0;
      workedHours += hrs;
    } else if (rec.status === "On Leave") {
      paidLeaveDays++;
    } else if (rec.status === "Absent" || rec.status === "Incomplete") {
      absentDays++;
    }
  });

  const baseSalary = Number(employee.employee_salary) || 120000;
  const expectedHoursPerDay = employee.assigned_shift?.expected_hours_per_day || 8.0;
  const standardWorkingDays = 22; // Average business days per month
  const expectedHours = standardWorkingDays * expectedHoursPerDay;

  // Earnings Breakdown
  const hra = Math.round(baseSalary * 0.25);
  const medicalAllowance = Math.round(baseSalary * 0.10);
  const specialAllowance = Math.round(baseSalary * 0.05);
  const grossEarnings = baseSalary + hra + medicalAllowance + specialAllowance;

  // Deductions Breakdown
  // Unpaid Leave / Absence deduction (Loss of Pay)
  const perDayPay = baseSalary / standardWorkingDays;
  const unpaidLeaveDeduction = Math.round(absentDays * perDayPay);

  // Standard progressive tax estimate (~3%) & Provident Fund (~2%)
  const incomeTax = Math.round(grossEarnings * 0.03);
  const providentFund = Math.round(grossEarnings * 0.02);
  const otherDeductions = 0;

  const totalDeductions = unpaidLeaveDeduction + incomeTax + providentFund + otherDeductions;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);
  const netSalaryWords = convertNumberToWords(netSalary);

  const payableHours = Math.max(0, expectedHours - (absentDays * expectedHoursPerDay));

  return {
    firm_id: firmId,
    employee_code: employee.employee_code,
    employee_name: `${employee.employee_fname} ${employee.employee_lname}`,
    employee_designation: employee.employee_designation || "Staff",
    employee_department: employee.employee_department || "General",
    period,
    month_name: monthName,
    year: yearStr,
    salary_basis: employee.salary_basis || "Monthly",
    base_salary: baseSalary,
    hra,
    medical_allowance: medicalAllowance,
    special_allowance: specialAllowance,
    gross_earnings: grossEarnings,
    expected_hours: expectedHours,
    worked_hours: workedHours > 0 ? workedHours : payableHours,
    payable_hours: payableHours,
    total_days_in_month: totalDaysInMonth,
    present_days: presentDays,
    absent_days: absentDays,
    paid_leave_days: paidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    income_tax: incomeTax,
    provident_fund: providentFund,
    unpaid_leave_deduction: unpaidLeaveDeduction,
    other_deductions: otherDeductions,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    net_salary_in_words: netSalaryWords,
  };
};

// 1. Generate or update payroll for all active employees for a period
export const generatePeriodPayroll = async (req, res) => {
  try {
    const { period, finalize = false } = req.body; // period: "YYYY-MM"
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ success: false, message: "Valid period (YYYY-MM) is required" });
    }

    const firmId = req.user?.firm_id;
    if (!firmId) {
      return res.status(400).json({ success: false, message: "Firm association required" });
    }

    const activeEmployees = await Employees.find({
      firm_id: firmId,
      employment_status: { $nin: ["Terminated", "Ex"] },
    });

    const generatedRecords = [];

    for (const emp of activeEmployees) {
      const calcData = await calculateEmployeePayroll(firmId, emp, period);

      let record = await PayrollRecord.findOne({
        firm_id: firmId,
        employee_code: emp.employee_code,
        period,
      });

      if (record) {
        // If already finalized, do not mutate unless user has manager/admin privilege
        if (record.status === "finalized" && !finalize) {
          generatedRecords.push(record);
          continue;
        }

        Object.assign(record, calcData);
        if (finalize) {
          record.status = "finalized";
          record.finalized_at = new Date();
          record.finalized_by = req.user?.user_id;
          record.audit_trail.push({
            action: "FINALIZED",
            performed_by: req.user?.user_fullname || "Manager",
            details: { net_salary: record.net_salary },
          });
        }
        await record.save();
        generatedRecords.push(record);
      } else {
        record = new PayrollRecord({
          ...calcData,
          status: finalize ? "finalized" : "draft",
          finalized_at: finalize ? new Date() : null,
          finalized_by: finalize ? req.user?.user_id : null,
          audit_trail: [
            {
              action: "CREATED",
              performed_by: req.user?.user_fullname || "System",
              details: { net_salary: calcData.net_salary },
            },
          ],
        });
        await record.save();
        generatedRecords.push(record);
      }
    }

    res.status(200).json({
      success: true,
      message: `Payroll for period ${period} processed successfully (${generatedRecords.length} records)`,
      records: generatedRecords,
    });
  } catch (err) {
    console.error("Generate Period Payroll Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Get current logged-in employee's payslips
export const getMyPayslips = async (req, res) => {
  try {
    const userCode = req.user?.user_code;
    const { period, month, year } = req.query;

    const query = { employee_code: userCode };
    if (req.user?.firm_id) query.firm_id = req.user.firm_id;
    if (period) query.period = period;
    if (month) query.month_name = month;
    if (year) query.year = year;

    let records = await PayrollRecord.find(query).sort({ period: -1 });

    // If no payroll record exists yet for current month/year, generate a draft preview dynamically
    if (records.length === 0 && (month || period)) {
      const targetPeriod = period || `${year || new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const emp = await Employees.findOne({ employee_code: userCode });
      if (emp) {
        const firmId = emp.firm_id || req.user?.firm_id;
        const draft = await calculateEmployeePayroll(firmId, emp, targetPeriod);
        const newRecord = new PayrollRecord({ ...draft, status: "draft" });
        await newRecord.save();
        records = [newRecord];
      }
    }

    res.status(200).json({ success: true, payslips: records });
  } catch (err) {
    console.error("Get My Payslips Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Get team payslips (Manager & Admin only, firm-scoped)
export const getTeamPayslips = async (req, res) => {
  try {
    const { period, month, year, search } = req.query;

    const query = {};
    if (req.user?.user_role !== "admin" && req.user?.user_role !== 0) {
      query.firm_id = req.user.firm_id;
    } else if (req.query.firm_id) {
      query.firm_id = req.query.firm_id;
    }

    if (period) query.period = period;
    if (month) query.month_name = month;
    if (year) query.year = year;

    let records = await PayrollRecord.find(query).sort({ period: -1, employee_name: 1 });

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          r.employee_department.toLowerCase().includes(q)
      );
    }

    res.status(200).json({ success: true, payslips: records });
  } catch (err) {
    console.error("Get Team Payslips Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Download PDF Payslip (With role and firm authorization)
export const downloadPayslipPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await PayrollRecord.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payslip record not found" });
    }

    // Role & Firm Authorization Check:
    // - Employee can only download their own payslip
    // - Managers can only download payslips for employees in their firm
    // - Admins can download payslips
    const userRole = req.user?.user_role;
    const userCode = req.user?.user_code;
    const userFirmId = req.user?.firm_id;

    const isOwnPayslip = payroll.employee_code === userCode;
    const isSameFirmManager =
      (userRole === "manager" || userRole === "ceo" || req.user?.user_designation === "CEO") &&
      String(payroll.firm_id) === String(userFirmId);
    const isAdmin = userRole === "admin" || userRole === 0;

    if (!isOwnPayslip && !isSameFirmManager && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not authorized to view or download this payslip.",
      });
    }

    // Fetch Firm Information
    const firm = (await Firm.findById(payroll.firm_id)) || {
      firm_name: "Apexion Strativa Global",
      firm_address: "Strativa Tech Tower, Corporate Avenue",
    };

    // Set Response Headers for PDF Download
    const filename = `Payslip_${payroll.employee_code}_${payroll.period}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    buildPayslipPdf(payroll, firm, res);
  } catch (err) {
    console.error("Download Payslip PDF Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

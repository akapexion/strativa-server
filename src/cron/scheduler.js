import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import LoginAttempt from "../models/LoginAttempt.js";
import CronJobLog from "../models/CronJobLog.js";
import Firm from "../models/Firm.js";
import Employees from "../models/employees.js";
import PayrollRecord from "../models/PayrollRecord.js";
import { calculateEmployeePayroll } from "../controllers/payrollController.js";

/**
 * 1. Missing Punch Audit:
 * Runs daily at 9:00 PM. Scans attendance records for today that have a check_in
 * but no check_out. Safely marks them as "Incomplete" without assigning fake hours.
 */
export const runMissingPunchCheck = async (targetDateStr) => {
  const d = new Date();
  const dateStr =
    targetDateStr ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const runKey = `missing-punch-${dateStr}`;

  try {
    const log = new CronJobLog({
      job_name: "missing_punch_check",
      run_key: runKey,
      status: "started",
    });
    await log.save();

    const missingPunches = await Attendance.find({
      date: dateStr,
      check_in: { $ne: "" },
      check_out: "",
      status: { $ne: "Incomplete" },
    });

    for (const rec of missingPunches) {
      rec.status = "Incomplete";
      rec.work_hours = "—";
      await rec.save();
    }

    log.status = "completed";
    log.completed_at = new Date();
    log.result_summary = { auditedDate: dateStr, updatedCount: missingPunches.length };
    await log.save();

    console.log(`[CRON] Missing punch audit complete: ${missingPunches.length} marked incomplete.`);
    return { success: true, updatedCount: missingPunches.length };
  } catch (err) {
    console.error("[CRON] Missing punch audit failed:", err);
    await CronJobLog.findOneAndUpdate(
      { run_key: runKey },
      { status: "failed", error_message: err.message, completed_at: new Date() }
    );
    return { success: false, error: err.message };
  }
};

/**
 * 2. Cleanup expired rate limits and temporary logs
 */
export const runRateLimitCleanup = async () => {
  const runKey = `ratelimit-cleanup-${Date.now()}`;
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await LoginAttempt.deleteMany({
      last_attempt_at: { $lt: twoHoursAgo },
    });

    console.log(`[CRON] Cleaned up ${result.deletedCount} expired login attempts.`);
    return { success: true, deletedCount: result.deletedCount };
  } catch (err) {
    console.error("[CRON] Rate limit cleanup failed:", err);
    return { success: false, error: err.message };
  }
};

/**
 * 3. End-of-month draft payroll processing (Idempotent)
 */
export const runPayrollDraftProcessing = async () => {
  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const runKey = `payroll-draft-${period}`;

  try {
    const existingLog = await CronJobLog.findOne({
      job_name: "payroll_draft_processing",
      run_key: runKey,
      status: "completed",
    });

    if (existingLog) {
      console.log(`[CRON] Payroll draft for period ${period} already completed.`);
      return { success: true, message: "Already processed" };
    }

    const log = new CronJobLog({
      job_name: "payroll_draft_processing",
      run_key: runKey,
      status: "started",
    });
    await log.save();

    const firms = await Firm.find({ status: "active" });
    let totalGenerated = 0;

    for (const firm of firms) {
      const activeEmployees = await Employees.find({
        firm_id: firm._id,
        employment_status: { $nin: ["Terminated", "Ex"] },
      });

      for (const emp of activeEmployees) {
        const existing = await PayrollRecord.findOne({
          firm_id: firm._id,
          employee_code: emp.employee_code,
          period,
        });

        if (!existing) {
          const calcData = await calculateEmployeePayroll(firm._id, emp, period);
          const record = new PayrollRecord({
            ...calcData,
            status: "draft",
            audit_trail: [
              {
                action: "AUTO_DRAFT_CRON",
                performed_by: "System Cron",
                details: { net_salary: calcData.net_salary },
              },
            ],
          });
          await record.save();
          totalGenerated++;
        }
      }
    }

    log.status = "completed";
    log.completed_at = new Date();
    log.result_summary = { period, totalGenerated };
    await log.save();

    console.log(`[CRON] Payroll draft processing complete: ${totalGenerated} draft records generated.`);
    return { success: true, totalGenerated };
  } catch (err) {
    console.error("[CRON] Payroll draft processing failed:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Initialize cron jobs (invoked when running as a persistent Node process)
 */
export const initScheduledJobs = () => {
  // Only start node-cron when not running inside serverless / Vercel
  if (process.env.VERCEL) {
    console.log("[CRON] Running in Vercel serverless environment. Background scheduler uses HTTP triggers.");
    return;
  }

  console.log("[CRON] Initializing persistent node-cron background scheduler...");

  // Missing punch check every day at 21:00 (9 PM)
  cron.schedule("0 21 * * *", () => {
    console.log("[CRON] Executing scheduled missing punch check...");
    runMissingPunchCheck();
  });

  // Rate limit and temporary record cleanup every hour
  cron.schedule("0 * * * *", () => {
    console.log("[CRON] Executing hourly rate limit cleanup...");
    runRateLimitCleanup();
  });

  // Payroll draft processing on the 28th of every month at 23:00 (11 PM)
  cron.schedule("0 23 28 * *", () => {
    console.log("[CRON] Executing monthly payroll draft processing...");
    runPayrollDraftProcessing();
  });
};

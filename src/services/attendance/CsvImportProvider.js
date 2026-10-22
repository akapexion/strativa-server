import { AttendanceProvider } from "./AttendanceProvider.js";
import AttendanceRawPunch from "../../models/AttendanceRawPunch.js";
import { processDailyAttendanceForEmployee, formatDateString } from "./PunchProcessor.js";

export class CsvImportProvider extends AttendanceProvider {
  constructor() {
    super("CSV_IMPORT");
  }

  /**
   * Parse CSV content into array of attendance punch records
   * Supports common formats:
   * 1. employee_code, timestamp (ISO or YYYY-MM-DD HH:mm:ss)
   * 2. employee_code, date, time, punch_type (Check-In / Check-Out)
   */
  parseCsv(csvContent) {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV file is empty or missing headers");
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows = [];

    // Find column indexes
    const codeIdx = header.findIndex((h) => h.includes("code") || h.includes("emp") || h.includes("badge") || h.includes("id"));
    const timestampIdx = header.findIndex((h) => h.includes("timestamp") || h.includes("datetime"));
    const dateIdx = header.findIndex((h) => h === "date" || h.includes("date"));
    const timeIdx = header.findIndex((h) => h === "time" || h.includes("time"));
    const typeIdx = header.findIndex((h) => h.includes("type") || h.includes("state") || h.includes("action"));

    if (codeIdx === -1) {
      throw new Error("Missing Employee Code or ID column in CSV");
    }

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length < 2) continue;

      const employeeCode = parts[codeIdx]?.toUpperCase();
      if (!employeeCode) continue;

      let punchDate = null;
      if (timestampIdx !== -1 && parts[timestampIdx]) {
        punchDate = new Date(parts[timestampIdx]);
      } else if (dateIdx !== -1 && timeIdx !== -1) {
        punchDate = new Date(`${parts[dateIdx]} ${parts[timeIdx]}`);
      } else if (dateIdx !== -1) {
        punchDate = new Date(parts[dateIdx]);
      }

      if (!punchDate || isNaN(punchDate.getTime())) {
        continue;
      }

      let punchType = "AUTO";
      if (typeIdx !== -1 && parts[typeIdx]) {
        const t = parts[typeIdx].toUpperCase();
        if (t.includes("IN")) punchType = "CHECK_IN";
        else if (t.includes("OUT")) punchType = "CHECK_OUT";
      }

      rows.push({
        employee_code: employeeCode,
        timestamp: punchDate,
        date_str: formatDateString(punchDate),
        punch_type: punchType,
      });
    }

    return rows;
  }

  /**
   * Import punches and process daily records
   */
  async importPunches(firmId, csvString, deviceId = "CSV_IMPORT") {
    const rawRows = this.parseCsv(csvString);
    let inserted = 0;
    let skipped = 0;
    const affected = new Map(); // employeeCode -> Set of dateStr

    for (const row of rawRows) {
      try {
        const rawPunch = new AttendanceRawPunch({
          firm_id: firmId,
          employee_code: row.employee_code,
          device_id: deviceId,
          timestamp: row.timestamp,
          date_str: row.date_str,
          punch_type: row.punch_type,
          verification_mode: "CSV_IMPORT",
        });

        await rawPunch.save();
        inserted++;

        if (!affected.has(row.employee_code)) {
          affected.set(row.employee_code, new Set());
        }
        affected.get(row.employee_code).add(row.date_str);
      } catch (err) {
        // E11000 duplicate key error means this punch already exists
        if (err.code === 11000) {
          skipped++;
        } else {
          console.error("Punch insert error:", err.message);
        }
      }
    }

    // Process aggregated daily records for affected employees and dates
    let processedRecords = 0;
    for (const [code, dates] of affected.entries()) {
      for (const d of dates) {
        await processDailyAttendanceForEmployee(firmId, code, d);
        processedRecords++;
      }
    }

    return {
      success: true,
      totalRows: rawRows.length,
      insertedPunches: inserted,
      duplicatesSkipped: skipped,
      processedAttendanceDays: processedRecords,
    };
  }
}

export default new CsvImportProvider();

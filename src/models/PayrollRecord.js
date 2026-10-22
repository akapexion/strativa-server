import mongoose from "mongoose";

const payrollRecordSchema = new mongoose.Schema(
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
      index: true,
    },
    employee_name: {
      type: String,
      required: true,
    },
    employee_designation: {
      type: String,
      default: "",
    },
    employee_department: {
      type: String,
      default: "",
    },
    period: {
      type: String, // e.g. "2026-07"
      required: true,
      index: true,
    },
    month_name: {
      type: String, // e.g. "July"
      required: true,
    },
    year: {
      type: String, // e.g. "2026"
      required: true,
    },
    salary_basis: {
      type: String,
      enum: ["Monthly", "Hourly"],
      default: "Monthly",
    },
    base_salary: {
      type: Number,
      required: true,
      default: 0,
    },
    // Earnings Breakdown
    hra: {
      type: Number,
      default: 0,
    },
    medical_allowance: {
      type: Number,
      default: 0,
    },
    special_allowance: {
      type: Number,
      default: 0,
    },
    gross_earnings: {
      type: Number,
      required: true,
      default: 0,
    },
    // Working hours & Attendance breakdown
    expected_hours: {
      type: Number,
      default: 160,
    },
    worked_hours: {
      type: Number,
      default: 160,
    },
    payable_hours: {
      type: Number,
      default: 160,
    },
    total_days_in_month: {
      type: Number,
      default: 30,
    },
    present_days: {
      type: Number,
      default: 0,
    },
    absent_days: {
      type: Number,
      default: 0,
    },
    paid_leave_days: {
      type: Number,
      default: 0,
    },
    unpaid_leave_days: {
      type: Number,
      default: 0,
    },
    // Deductions Breakdown
    income_tax: {
      type: Number,
      default: 0,
    },
    provident_fund: {
      type: Number,
      default: 0,
    },
    unpaid_leave_deduction: {
      type: Number,
      default: 0,
    },
    other_deductions: {
      type: Number,
      default: 0,
    },
    total_deductions: {
      type: Number,
      required: true,
      default: 0,
    },
    // Net Payable
    net_salary: {
      type: Number,
      required: true,
      default: 0,
    },
    net_salary_in_words: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "finalized", "paid"],
      default: "draft",
    },
    payment_date: {
      type: Date,
    },
    finalized_at: {
      type: Date,
    },
    finalized_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    audit_trail: [
      {
        action: String,
        performed_by: String,
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

payrollRecordSchema.index(
  { firm_id: 1, employee_code: 1, period: 1 },
  { unique: true }
);

const PayrollRecord = mongoose.model("PayrollRecord", payrollRecordSchema);
export default PayrollRecord;

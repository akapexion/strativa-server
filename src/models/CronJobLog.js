import mongoose from "mongoose";

const cronJobLogSchema = new mongoose.Schema(
  {
    job_name: {
      type: String,
      required: true,
      index: true,
    },
    run_key: {
      type: String, // e.g. "missing-punches-2026-10-22" or "payroll-draft-2026-07"
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["started", "completed", "failed"],
      default: "started",
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
    },
    result_summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

cronJobLogSchema.index({ job_name: 1, run_key: 1 });

const CronJobLog = mongoose.model("CronJobLog", cronJobLogSchema);
export default CronJobLog;

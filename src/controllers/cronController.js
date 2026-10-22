import {
  runMissingPunchCheck,
  runRateLimitCleanup,
  runPayrollDraftProcessing,
} from "../cron/scheduler.js";

export const handleCronTrigger = async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  const configuredSecret = process.env.CRON_SECRET || "strativacronsecret2026";

  if (secret !== configuredSecret && process.env.NODE_ENV === "production") {
    return res.status(401).json({ success: false, message: "Unauthorized cron trigger" });
  }

  const task = req.query.task || "all";
  const results = {};

  try {
    if (task === "all" || task === "missing-punches") {
      results.missingPunches = await runMissingPunchCheck(req.query.date);
    }
    if (task === "all" || task === "cleanup") {
      results.cleanup = await runRateLimitCleanup();
    }
    if (task === "all" || task === "payroll") {
      results.payroll = await runPayrollDraftProcessing();
    }

    res.status(200).json({
      success: true,
      message: "Cron jobs triggered and processed successfully",
      results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

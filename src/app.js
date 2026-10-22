import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import employeeRoute from "./routes/employeeRoute.js";
import authRoute from "./routes/authRoute.js";
import connectDB from "./config/db_connection.js";
import leaveTypeRoute from "./routes/leaveTypeRoutes.js";
import appraisalRoute from "./routes/appraisalRoute.js";
import DFIRoute from "./routes/DFIRoutes.js";
import KPIRoute from "./routes/KPIRoutes.js";
import profileRoute from "./routes/profileRoutes.js";
import formRoute from "./routes/formRoutes.js";
import leaveRoute from "./routes/leaveRoutes.js";
import notificationRoute from "./routes/notificationRoutes.js";
import customFormRoute from "./routes/customFormRoutes.js";
import attendanceRoute from "./routes/attendanceRoutes.js";
import firmRoute from "./routes/firmRoutes.js";
import payrollRoute from "./routes/payrollRoutes.js";
import chatRoute from "./routes/chatRoutes.js";
import cronRoute from "./routes/cronRoutes.js";
import { ensureDefaultFirmAndMigrate } from "./utils/migrateMultiFirm.js";
import { initScheduledJobs } from "./cron/scheduler.js";

const app = express();

// CORS configuration to allow requests from client deployments
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Static uploads directory (safe for local & Vercel serverless)
const uploadsStaticPath = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : "uploads";

if (!fs.existsSync(uploadsStaticPath)) {
  try {
    fs.mkdirSync(uploadsStaticPath, { recursive: true });
  } catch (_) {}
}

app.use("/uploads", express.static(uploadsStaticPath));

// Fallback image route for production when image file is missing or on Vercel spin-down
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(uploadsStaticPath, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(path.resolve(filePath));
  }
  // Redirect to an SVG avatar or default transparent placeholder
  const initials = req.params.filename ? req.params.filename.charAt(0).toUpperCase() : "?";
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="100%" height="100%" fill="#e0e7ff"/>
      <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#4338ca" dominant-baseline="middle" text-anchor="middle">${initials}</text>
    </svg>
  `);
});

// Ensure DB connection and run safe default firm migration once connected
let migrationRan = false;
app.use(async (req, res, next) => {
  try {
    await connectDB();
    if (!migrationRan) {
      migrationRan = true;
      ensureDefaultFirmAndMigrate().catch(console.error);
    }
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({ status: false, message: "Database connection error" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: true, message: "Strativa API Running" });
});

// Core Routes
app.use("/auth", authRoute);
app.use("/user", authRoute);
app.use("/admin", employeeRoute);
app.use("/user", employeeRoute);
app.use("/user", appraisalRoute);
app.use("/user", DFIRoute);
app.use("/user", KPIRoute);
app.use("/admin", leaveTypeRoute);
app.use("/user", leaveTypeRoute);
app.use("/manager", formRoute);
app.use("/manager", employeeRoute);
app.use("/profile", profileRoute);
app.use("/notifications", notificationRoute);
app.use("/custom-forms", customFormRoute);
app.use("/attendance", attendanceRoute);

// New Enhanced Modules
app.use("/firm", firmRoute);
app.use("/admin/firm", firmRoute);
app.use("/payroll", payrollRoute);
app.use("/chat", chatRoute);
app.use("/cron", cronRoute);
app.use("/api/cron", cronRoute);

// Initialize background schedulers for persistent Node mode
initScheduledJobs();

// Start server locally when not on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

export default app;

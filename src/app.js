import express from "express";
import cors from "cors";

// Routes
import employeeRoute from "./routes/employeeRoute.js";
import authRoute from "./routes/authRoute.js";
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

// Database
import connectDB from "./config/db_connection.js";

const app = express();

/* =========================
   Middleware
========================= */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Static Files
========================= */

app.use("/uploads", express.static("uploads"));

/* =========================
   Health Check
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

/* =========================
   Database
========================= */

await connectDB();

/* =========================
   Routes
========================= */

app.use("/auth", authRoute);

app.use("/user", authRoute);

app.use("/admin", employeeRoute);
app.use("/user", employeeRoute);
app.use("/manager", employeeRoute);

app.use("/user", appraisalRoute);
app.use("/user", DFIRoute);
app.use("/user", KPIRoute);

app.use("/admin", leaveTypeRoute);
app.use("/user", leaveTypeRoute);

app.use("/", leaveRoute);

app.use("/manager", formRoute);

app.use("/profile", profileRoute);

app.use("/notifications", notificationRoute);

app.use("/custom-forms", customFormRoute);

app.use("/attendance", attendanceRoute);

/* =========================
   404 Handler
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================
   Error Handler
========================= */

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* =========================
   Export
========================= */

// Do NOT use app.listen() here.
export default app;

import express from "express";
import cors from "cors";
import path from "path";
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

const app = express();

// CORS configuration to allow requests from client deployments
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Static uploads directory (safe for local & Vercel serverless)
const uploadsStaticPath = process.env.VERCEL ? path.join("/tmp", "uploads") : "uploads";
app.use("/uploads", express.static(uploadsStaticPath));

// Ensure DB connection for incoming requests in serverless environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
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

app.use("/auth", authRoute);
app.use("/user", authRoute);
app.use("/admin", employeeRoute);
app.use("/user", employeeRoute);
app.use("/user", appraisalRoute);
app.use("/user", DFIRoute);
app.use("/user", KPIRoute);
app.use("/admin", leaveTypeRoute);
app.use("/user", leaveTypeRoute);
// app.use("/", leaveRoute);
app.use("/manager", formRoute);
app.use("/manager", employeeRoute);
app.use("/profile", profileRoute);
app.use("/notifications", notificationRoute);
app.use("/custom-forms", customFormRoute);
app.use("/attendance", attendanceRoute);

// Start server locally when not on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

export default app;

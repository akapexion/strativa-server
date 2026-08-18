import express from "express";
import cors from "cors";
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

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

connectDB();

app.use("/auth", authRoute);
app.use("/user", authRoute);
app.use("/admin", employeeRoute);
app.use("/user", employeeRoute);
app.use("/user", appraisalRoute);
app.use("/user", DFIRoute);
app.use("/user", KPIRoute);
app.use("/admin", leaveTypeRoute);
app.use("/user", leaveTypeRoute);
app.use("/", leaveRoute);
app.use("/manager", formRoute);
app.use("/manager", employeeRoute);
app.use("/profile", profileRoute);
app.use("/notifications", notificationRoute);
app.use("/custom-forms", customFormRoute);
app.use("/attendance", attendanceRoute);

export default app;

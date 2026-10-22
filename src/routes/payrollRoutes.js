import express from "express";
import {
  generatePeriodPayroll,
  getMyPayslips,
  getTeamPayslips,
  downloadPayslipPdf,
} from "../controllers/payrollController.js";
import { verifyToken, requireManagerOrAdmin } from "../middleware/authMiddleware.js";

const payrollRoute = express.Router();

payrollRoute.use(verifyToken);

// Employee payslip views
payrollRoute.get("/my-payslips", getMyPayslips);
payrollRoute.get("/payslip/:id/pdf", downloadPayslipPdf);

// Manager / Admin payroll management
payrollRoute.post("/generate-period", requireManagerOrAdmin, generatePeriodPayroll);
payrollRoute.get("/team-payslips", requireManagerOrAdmin, getTeamPayslips);

export default payrollRoute;

import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { addEmployee, allEmployees, currentEmployeeFormSubmissions, deleteEmployee, fetchSingleEmployee, formSubmissionDetail, updateEmployee } from "../controllers/employeeController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const employeeRoute = express.Router();

employeeRoute.use(verifyToken);

employeeRoute.post("/add-employee", upload.single("employee_image"), addEmployee);
employeeRoute.get("/all-employees", allEmployees);
employeeRoute.get("/employee/:id", fetchSingleEmployee);
employeeRoute.get("/current-employee-formsubmissions/:code", currentEmployeeFormSubmissions);
employeeRoute.get("/form-submission/:id", formSubmissionDetail);
employeeRoute.put("/update-employee/:id", updateEmployee);
employeeRoute.delete("/delete-employee/:id", deleteEmployee);

export default employeeRoute;
import express from "express";
import { createCustomForm, getCustomForms, getCustomFormById, deleteCustomForm, updateCustomForm, submitCustomForm, getAllSubmissionsForAdmin } from "../controllers/customFormController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const customFormRoute = express.Router();

customFormRoute.use(verifyToken);

customFormRoute.post("/add-form", createCustomForm);
customFormRoute.get("/all-forms", getCustomForms);
customFormRoute.get("/admin/all-submissions", getAllSubmissionsForAdmin);
customFormRoute.get("/:id", getCustomFormById);
customFormRoute.put("/:id", updateCustomForm);
customFormRoute.delete("/:id", deleteCustomForm);
customFormRoute.post("/submit", submitCustomForm);

export default customFormRoute;

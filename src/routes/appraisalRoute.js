import express from "express";
import { getMyAppraisals, raiseAppraisal } from "../controllers/appraisalController.js";

const appraisalRoute = express.Router();

appraisalRoute.post("/raise-appraisal", raiseAppraisal);
appraisalRoute.get("/appraisals/:code", getMyAppraisals);
appraisalRoute.get("/appraisals", getMyAppraisals);

export default appraisalRoute;
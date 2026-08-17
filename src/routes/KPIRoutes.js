import express from "express";
import { getMyKPIs, raiseKPI } from "../controllers/KPIController.js";

const KPIRoute = express.Router();

KPIRoute.post("/raise-kpi", raiseKPI);
KPIRoute.get("/kpis/:code", getMyKPIs);
KPIRoute.get("/kpis/", getMyKPIs);

export default KPIRoute;
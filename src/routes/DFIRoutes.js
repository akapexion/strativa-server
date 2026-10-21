import express from "express";
import { getMyDFIs, raiseDFI } from "../controllers/DFIController.js";

const DFIRoute = express.Router();

DFIRoute.post("/raise-dfi", raiseDFI);
DFIRoute.get("/dfis/:code", getMyDFIs);
DFIRoute.get("/dfis", getMyDFIs);

export default DFIRoute;
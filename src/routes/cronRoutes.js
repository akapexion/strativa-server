import express from "express";
import { handleCronTrigger } from "../controllers/cronController.js";

const cronRoute = express.Router();

cronRoute.get("/trigger", handleCronTrigger);
cronRoute.post("/trigger", handleCronTrigger);

export default cronRoute;

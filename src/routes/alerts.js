import express from "express";
import alertsController from "../controllers/alertsController.js";

const router = express.Router();

router.get("/alerts", alertsController.getAlerts);

export default router;

const express = require("express");
const alertsController = require("../controllers/alertsController");

const router = express.Router();

router.get("/alerts", alertsController.getAlerts);

module.exports = router;

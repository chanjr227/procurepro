const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const { getDashboardSummary } = require("../controllers/dashboardController");

router.use(authenticate);

router.get("/summary", getDashboardSummary);

module.exports = router;

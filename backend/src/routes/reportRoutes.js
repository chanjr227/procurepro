const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const { getReports } = require("../controllers/reportController");

router.get("/", authenticate, getReports);

module.exports = router;

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const { getLowStockAlerts } = require("../controllers/lowStockController");

// Semua endpoint notifikasi harus login
router.use(authenticate);

router.get("/", getLowStockAlerts);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  getInventory,
  createInventoryItem,
  getInventoryDetail,
  updateInventoryItem,
  getInventorySummary,
} = require("../controllers/inventoryController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Ringkasan inventory
router.get("/summary", getInventorySummary);

// Daftar inventory
router.get("/", getInventory);

// Tambah inventory
router.post("/", createInventoryItem);

// Detail inventory
router.get("/:id", getInventoryDetail);

// Update inventory
router.put("/:id", updateInventoryItem);

module.exports = router;

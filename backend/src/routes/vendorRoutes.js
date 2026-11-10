const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

// Semua endpoint wajib login
router.use(authenticate);

router.get("/", getVendors);
router.get("/:id", getVendorById);
router.post("/", createVendor);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

module.exports = router;

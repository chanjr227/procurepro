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

// Mengambil daftar vendor.
router.get("/", getVendors);
// Mengambil rincian vendor berdasarkan ID.
router.get("/:id", getVendorById);
// Membuat data vendor baru.
router.post("/", createVendor);
// Memperbarui vendor berdasarkan ID.
router.put("/:id", updateVendor);
// Menghapus vendor berdasarkan ID.
router.delete("/:id", deleteVendor);

module.exports = router;

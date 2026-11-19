const express = require("express");
const router = express.Router();

const {
  getWarehouses,
  createWarehouse,
  getWarehouseDetail,
  updateWarehouse,
} = require("../controllers/warehouseController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Mengambil daftar gudang.
router.get("/", getWarehouses);
// Membuat data gudang baru.
router.post("/", createWarehouse);
// Mengambil rincian gudang berdasarkan ID.
router.get("/:id", getWarehouseDetail);
// Memperbarui informasi gudang berdasarkan ID.
router.put("/:id", updateWarehouse);

module.exports = router;

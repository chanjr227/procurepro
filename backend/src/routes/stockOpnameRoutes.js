const express = require("express");
const router = express.Router();

const {
  getStockOpnames,
  getStockOpnameById,
  createStockOpname,
  updateStockOpnameItem,
  completeStockOpname,
} = require("../controllers/stockOpnameController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Mengambil daftar sesi stock opname.
router.get("/", getStockOpnames);
// Mengambil rincian stock opname berdasarkan ID.
router.get("/:id", getStockOpnameById);
// Membuat sesi stock opname baru.
router.post("/", createStockOpname);
// Memperbarui jumlah fisik item dalam sesi stock opname.
router.put("/:id/items/:itemId", updateStockOpnameItem);
// Menyelesaikan sesi stock opname.
router.post("/:id/complete", completeStockOpname);

module.exports = router;

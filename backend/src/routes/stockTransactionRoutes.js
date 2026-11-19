const express = require("express");
const router = express.Router();

const {
  getStockTransactions,
  createStockTransaction,
} = require("../controllers/stockTransactionController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Mengambil daftar transaksi pergerakan stok.
router.get("/", getStockTransactions);
// Mencatat transaksi pergerakan stok baru.
router.post("/", createStockTransaction);

module.exports = router;

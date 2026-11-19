const express = require("express");
const router = express.Router();

const {
  getGoodsReceipts,
  getGoodsReceiptOptions,
  getGoodsReceiptDetail,
  createGoodsReceipt,
} = require("../controllers/goodsReceiptController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Mengambil pilihan purchase order untuk proses penerimaan.
router.get("/options", getGoodsReceiptOptions);
// Mengambil daftar penerimaan barang.
router.get("/", getGoodsReceipts);
// Mencatat penerimaan barang baru.
router.post("/", createGoodsReceipt);
// Mengambil rincian penerimaan barang berdasarkan ID.
router.get("/:id", getGoodsReceiptDetail);

module.exports = router;

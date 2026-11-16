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

router.get("/options", getGoodsReceiptOptions);
router.get("/", getGoodsReceipts);
router.post("/", createGoodsReceipt);
router.get("/:id", getGoodsReceiptDetail);

module.exports = router;

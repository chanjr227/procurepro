const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getGoodsReceipts,
  getGoodsReceiptOptions,
  getGoodsReceiptDetail,
  createGoodsReceipt,
} = require("../controllers/goodsReceiptController");

router.use(authenticate);

router.get("/options", getGoodsReceiptOptions);
router.get("/", getGoodsReceipts);
router.get("/:id", getGoodsReceiptDetail);
router.post("/", createGoodsReceipt);

module.exports = router;

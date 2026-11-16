const express = require("express");
const router = express.Router();

const {
  getStockTransactions,
  createStockTransaction,
} = require("../controllers/stockTransactionController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", getStockTransactions);
router.post("/", createStockTransaction);

module.exports = router;

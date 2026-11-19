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

router.get("/", getStockOpnames);
router.get("/:id", getStockOpnameById);
router.post("/", createStockOpname);
router.put("/:id/items/:itemId", updateStockOpnameItem);
router.post("/:id/complete", completeStockOpname);

module.exports = router;

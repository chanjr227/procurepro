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

router.get("/", getWarehouses);
router.post("/", createWarehouse);
router.get("/:id", getWarehouseDetail);
router.put("/:id", updateWarehouse);

module.exports = router;

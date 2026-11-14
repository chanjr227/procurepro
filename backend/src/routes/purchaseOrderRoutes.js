const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getPurchaseOrders,
  getPurchaseOrderOptions,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
} = require("../controllers/purchaseOrderController");

router.use(authenticate);

// Pilihan Vendor aktif dan Requisition approved
router.get("/options", getPurchaseOrderOptions);

// Daftar Purchase Orders
router.get("/", getPurchaseOrders);

// Detail Purchase Order
router.get("/:id", getPurchaseOrderDetail);

// Buat Purchase Order
router.post("/", createPurchaseOrder);

// Edit Purchase Order
router.put("/:id", updatePurchaseOrder);

// Ubah status
router.patch("/:id/status", updatePurchaseOrderStatus);

module.exports = router;

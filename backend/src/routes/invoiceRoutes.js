const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getInvoices,
  getInvoiceOptions,
  getInvoiceDetail,
  createInvoice,
  getInvoiceMatching,
  verifyInvoice,
  rejectInvoice,
  payInvoice,
} = require("../controllers/invoiceController");

// Semua endpoint Invoice wajib login
router.use(authenticate);

// GET daftar Invoice
router.get("/", getInvoices);

// GET pilihan Purchase Order untuk Invoice
router.get("/options", getInvoiceOptions);

// GET Three-Way Matching
router.get("/:id/matching", getInvoiceMatching);

// POST membuat Invoice
router.post("/", createInvoice);

// PATCH verifikasi Invoice
router.patch("/:id/verify", verifyInvoice);

// PATCH menolak Invoice
router.patch("/:id/reject", rejectInvoice);

// PATCH pembayaran Invoice
router.patch("/:id/pay", payInvoice);

// GET detail Invoice
router.get("/:id", getInvoiceDetail);

module.exports = router;

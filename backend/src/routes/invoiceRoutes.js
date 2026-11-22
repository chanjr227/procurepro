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

router.use(authenticate);

router.get("/", getInvoices);
router.get("/options", getInvoiceOptions);
router.get("/:id/matching", getInvoiceMatching);
router.get("/:id", getInvoiceDetail);

router.post("/", createInvoice);

router.patch("/:id/verify", verifyInvoice);
router.patch("/:id/reject", rejectInvoice);
router.patch("/:id/pay", payInvoice);

module.exports = router;

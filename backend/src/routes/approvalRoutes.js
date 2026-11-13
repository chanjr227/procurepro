const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getPendingApprovals,
  getApprovalDetail,
  approveRequisition,
  rejectRequisition,
  getApprovalHistory,
} = require("../controllers/approvalController");

router.use(authenticate);

// Daftar pengajuan pending
router.get("/pending", getPendingApprovals);

// Riwayat seluruh approval
router.get("/history", getApprovalHistory);

// Detail approval
router.get("/:id", getApprovalDetail);

// Setujui pengajuan
router.post("/:id/approve", approveRequisition);

// Tolak pengajuan
router.post("/:id/reject", rejectRequisition);

module.exports = router;

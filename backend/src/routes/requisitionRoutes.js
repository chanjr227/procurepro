const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  submitRequisition,
} = require("../controllers/requisitionController");

// Semua endpoint wajib login
router.use(authenticate);

// Mengambil daftar requisition.
router.get("/", getRequisitions);
// Mengambil rincian requisition berdasarkan ID.
router.get("/:id", getRequisitionById);
// Membuat requisition baru.
router.post("/", createRequisition);
// Memperbarui requisition berdasarkan ID.
router.put("/:id", updateRequisition);
// Menghapus requisition berdasarkan ID.
router.delete("/:id", deleteRequisition);
// Mengirim requisition untuk proses persetujuan.
router.post("/:id/submit", submitRequisition);

module.exports = router;

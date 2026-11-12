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

router.get("/", getRequisitions);
router.get("/:id", getRequisitionById);
router.post("/", createRequisition);
router.put("/:id", updateRequisition);
router.delete("/:id", deleteRequisition);
router.post("/:id/submit", submitRequisition);

module.exports = router;

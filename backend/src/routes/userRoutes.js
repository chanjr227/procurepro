const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
} = require("../controllers/userController");

// Semua endpoint di bawah hanya dapat diakses Super Admin.
router.use(authenticate, authorizeRoles("SUPER_ADMIN"));

router.get("/", getUsers);
router.get("/roles", getRoles);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/password", resetUserPassword);

module.exports = router;

const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");

// Memproses login pengguna.
router.post("/login", login);

module.exports = router;

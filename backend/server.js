const express = require("express");
const cors = require("cors");
const prisma = require("./src/lib/prisma");
const authRoutes = require("./src/routes/authRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);

// Route utama
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProcurePro Backend API berhasil dijalankan!",
  });
});

// Tes koneksi database
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Koneksi database MySQL berhasil!",
      database: "procurepro_db",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Koneksi database gagal!",
      error: error.message,
    });
  }
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

const express = require("express");
const cors = require("cors");
const prisma = require("./src/lib/prisma");

const authRoutes = require("./src/routes/authRoutes");
const vendorRoutes = require("./src/routes/vendorRoutes");

const requisitionRoutes = require("./src/routes/requisitionRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware HARUS sebelum routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);

app.use("/api/requisitions", requisitionRoutes);

// Homepage
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProcurePro Backend API berhasil dijalankan!",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Koneksi database MySQL berhasil!",
      database: "procurepro_db",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Koneksi database gagal!",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

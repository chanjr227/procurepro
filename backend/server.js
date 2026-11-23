const express = require("express");
const cors = require("cors");
const prisma = require("./src/lib/prisma");

require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const vendorRoutes = require("./src/routes/vendorRoutes");
const requisitionRoutes = require("./src/routes/requisitionRoutes");
const approvalRoutes = require("./src/routes/approvalRoutes");
const purchaseOrderRoutes = require("./src/routes/purchaseOrderRoutes");
const goodsReceiptRoutes = require("./src/routes/goodsReceiptRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const warehouseRoutes = require("./src/routes/warehouseRoutes");
const stockTransactionRoutes = require("./src/routes/stockTransactionRoutes");
const stockOpnameRoutes = require("./src/routes/stockOpnameRoutes");
const lowStockRoutes = require("./src/routes/lowStockRoutes");
const invoiceRoutes = require("./src/routes/invoiceRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const userRoutes = require("./src/routes/userRoutes");

// Menyiapkan aplikasi Express dan port layanan backend.
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// console.log("=== CEK ROUTES ===");
// console.log("authRoutes:", typeof authRoutes);
// console.log("vendorRoutes:", typeof vendorRoutes);
// console.log("requisitionRoutes:", typeof requisitionRoutes);
// console.log("approvalRoutes:", typeof approvalRoutes);
// console.log("purchaseOrderRoutes:", typeof purchaseOrderRoutes);
// console.log("goodsReceiptRoutes:", typeof goodsReceiptRoutes);
// console.log("inventoryRoutes:", typeof inventoryRoutes);
// console.log("warehouseRoutes:", typeof warehouseRoutes);
// console.log("stockTransactionRoutes:", typeof stockTransactionRoutes);
// console.log("==================");

// Mendaftarkan router fitur API pada prefix masing-masing.
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/requisitions", requisitionRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stock-transactions", stockTransactionRoutes);
app.use("/api/stock-opnames", stockOpnameRoutes);
app.use("/api/low-stock-alerts", lowStockRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);

// Menyediakan endpoint informasi dasar untuk memeriksa server.
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProcurePro Backend API berhasil dijalankan!",
  });
});

// Memeriksa konektivitas database melalui query sederhana.
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

// Menjalankan server agar API dapat menerima request.
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

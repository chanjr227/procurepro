const prisma = require("../lib/prisma");

// GET /api/stock-transactions
// Mengambil daftar transaksi pergerakan stok.
const getStockTransactions = async (req, res) => {
  try {
    const transactions = await prisma.stockTransaction.findMany({
      include: {
        inventoryItem: true,
        warehouse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Get stock transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat transaksi stok",
    });
  }
};

// POST /api/stock-transactions
// Mencatat transaksi baru dan menyesuaikan jumlah stok.
const createStockTransaction = async (req, res) => {
  try {
    const {
      inventoryItemId,
      warehouseId,
      transactionType,
      quantity,
      referenceNumber,
      notes,
    } = req.body;

    const itemId = Number(inventoryItemId);
    const whId = Number(warehouseId);
    const qty = Number(quantity);

    if (
      !Number.isInteger(itemId) ||
      itemId <= 0 ||
      !Number.isInteger(whId) ||
      whId <= 0 ||
      !Number.isInteger(qty) ||
      qty <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID barang, ID gudang, dan quantity harus berupa bilangan bulat positif",
      });
    }

    if (!["IN", "OUT", "ADJUSTMENT"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Tipe transaksi harus IN, OUT, atau ADJUSTMENT",
      });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      return res.status(404).json({
        success: false,
        message: "Barang tidak ditemukan atau tidak aktif",
      });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: whId },
    });

    if (!warehouse || !warehouse.isActive) {
      return res.status(404).json({
        success: false,
        message: "Gudang tidak ditemukan atau tidak aktif",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingStock = await tx.inventoryStock.findUnique({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: itemId,
            warehouseId: whId,
          },
        },
      });

      const stockBefore = existingStock?.quantity ?? 0;

      // IN menambah stok, OUT mengurangi stok.
      // ADJUSTMENT menggunakan quantity sebagai jumlah koreksi:
      // positif menambah, negatif mengurangi.
      const quantityChange =
        transactionType === "IN"
          ? qty
          : transactionType === "OUT"
            ? -qty
            : Number(req.body.quantityChange);

      if (
        !Number.isInteger(quantityChange) ||
        quantityChange === 0 ||
        (transactionType === "IN" && quantityChange <= 0) ||
        (transactionType === "OUT" && quantityChange >= 0)
      ) {
        throw new Error(
          "Untuk ADJUSTMENT, isi quantityChange dengan angka positif atau negatif yang tidak nol",
        );
      }

      const stockAfter = stockBefore + quantityChange;

      if (stockAfter < 0) {
        throw new Error("Stok tidak mencukupi untuk transaksi ini");
      }

      const stock = await tx.inventoryStock.upsert({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: itemId,
            warehouseId: whId,
          },
        },
        update: {
          quantity: stockAfter,
        },
        create: {
          inventoryItemId: itemId,
          warehouseId: whId,
          quantity: stockAfter,
        },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          transactionNumber: `STK-${Date.now()}`,
          transactionType,
          inventoryItemId: itemId,
          warehouseId: whId,
          quantityChange,
          stockBefore,
          stockAfter,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          performedBy: req.user?.userId ? String(req.user.userId) : null,
        },
        include: {
          inventoryItem: true,
          warehouse: true,
        },
      });

      return { stock, transaction };
    });

    res.status(201).json({
      success: true,
      message: "Transaksi stok berhasil dibuat",
      data: result,
    });
  } catch (error) {
    console.error("Create stock transaction error:", error);

    const statusCode =
      error.message === "Stok tidak mencukupi untuk transaksi ini" ||
      error.message.startsWith("Untuk ADJUSTMENT")
        ? 400
        : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal membuat transaksi stok",
    });
  }
};

module.exports = {
  getStockTransactions,
  createStockTransaction,
};

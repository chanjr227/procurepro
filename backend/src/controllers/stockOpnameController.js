const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

const opnameInclude = {
  warehouse: true,
  items: {
    include: {
      inventoryItem: true,
    },
    orderBy: {
      id: "asc",
    },
  },
};

// GET /api/stock-opnames
// Mengambil daftar sesi stock opname.
const getStockOpnames = async (req, res) => {
  try {
    const opnames = await prisma.stockOpname.findMany({
      include: {
        warehouse: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: opnames,
    });
  } catch (error) {
    console.error("Get Stock Opnames Error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data Stock Opname",
    });
  }
};

// GET /api/stock-opnames/:id
// Mengambil rincian stock opname beserta itemnya.
const getStockOpnameById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Stock Opname tidak valid",
      });
    }

    const opname = await prisma.stockOpname.findUnique({
      where: { id },
      include: opnameInclude,
    });

    if (!opname) {
      return res.status(404).json({
        success: false,
        message: "Stock Opname tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      data: opname,
    });
  } catch (error) {
    console.error("Get Stock Opname Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail Stock Opname",
    });
  }
};

// POST /api/stock-opnames
// Membuat sesi stock opname untuk gudang tertentu.
const createStockOpname = async (req, res) => {
  try {
    const warehouseId = Number(req.body.warehouseId);
    const { notes, opnameDate } = req.body;

    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Gudang wajib dipilih",
      });
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        isActive: true,
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Gudang tidak ditemukan atau tidak aktif",
      });
    }

    const date = opnameDate ? new Date(opnameDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Tanggal Stock Opname tidak valid",
      });
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        itemName: "asc",
      },
    });

    if (inventoryItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Belum ada barang aktif di Inventory Items",
      });
    }

    const stocks = await prisma.inventoryStock.findMany({
      where: {
        warehouseId,
      },
    });

    const stockMap = new Map(
      stocks.map((stock) => [stock.inventoryItemId, stock.quantity]),
    );

    const opnameNumber = `OPN-${Date.now()}`;

    const opname = await prisma.stockOpname.create({
      data: {
        opnameNumber,
        warehouseId,
        opnameDate: date,
        notes: notes || null,
        status: "DRAFT",
        items: {
          create: inventoryItems.map((item) => {
            const systemStock = stockMap.get(item.id) ?? 0;

            return {
              inventoryItemId: item.id,
              systemStock,
              physicalStock: systemStock,
              difference: 0,
            };
          }),
        },
      },
      include: opnameInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Stock Opname berhasil dibuat",
      data: opname,
    });
  } catch (error) {
    console.error("Create Stock Opname Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal membuat Stock Opname",
    });
  }
};

// PUT /api/stock-opnames/:id/items/:itemId
// Memperbarui hasil hitung fisik untuk item stock opname.
const updateStockOpnameItem = async (req, res) => {
  try {
    const opnameId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const physicalStock = Number(req.body.physicalStock);

    if (
      !Number.isInteger(opnameId) ||
      opnameId <= 0 ||
      !Number.isInteger(itemId) ||
      itemId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID Stock Opname atau item tidak valid",
      });
    }

    if (!Number.isInteger(physicalStock) || physicalStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stok fisik harus berupa bilangan bulat minimal 0",
      });
    }

    const opname = await prisma.stockOpname.findUnique({
      where: { id: opnameId },
    });

    if (!opname) {
      return res.status(404).json({
        success: false,
        message: "Stock Opname tidak ditemukan",
      });
    }

    if (opname.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Stock Opname yang sudah diproses tidak dapat diubah",
      });
    }

    const opnameItem = await prisma.stockOpnameItem.findFirst({
      where: {
        id: itemId,
        stockOpnameId: opnameId,
      },
    });

    if (!opnameItem) {
      return res.status(404).json({
        success: false,
        message: "Barang tidak ditemukan dalam Stock Opname ini",
      });
    }

    const difference = physicalStock - opnameItem.systemStock;

    const updatedItem = await prisma.stockOpnameItem.update({
      where: {
        id: itemId,
      },
      data: {
        physicalStock,
        difference,
      },
      include: {
        inventoryItem: true,
      },
    });

    return res.json({
      success: true,
      message: "Hasil perhitungan stok berhasil diperbarui",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Update Stock Opname Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui hasil Stock Opname",
    });
  }
};

// POST /api/stock-opnames/:id/complete
// Menyelesaikan stock opname dan menerapkan penyesuaian stok.
const completeStockOpname = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Stock Opname tidak valid",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const opname = await tx.stockOpname.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              inventoryItem: true,
            },
          },
          warehouse: true,
        },
      });

      if (!opname) {
        throw new Error("Stock Opname tidak ditemukan");
      }

      if (opname.status !== "DRAFT") {
        throw new Error("Stock Opname ini sudah pernah diproses");
      }

      if (opname.items.length === 0) {
        throw new Error("Stock Opname belum memiliki daftar barang");
      }

      // Pastikan stok belum berubah sejak opname dibuat.
      for (const item of opname.items) {
        const currentStock = await tx.inventoryStock.findUnique({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: item.inventoryItemId,
              warehouseId: opname.warehouseId,
            },
          },
        });

        const currentQuantity = currentStock?.quantity ?? 0;

        if (currentQuantity !== item.systemStock) {
          throw new Error(
            `Stok ${item.inventoryItem.itemName} berubah sejak opname dibuat. Buat Stock Opname baru agar hasilnya akurat.`,
          );
        }
      }

      // Terapkan selisih stok dan catat transaksi ADJUSTMENT.
      for (const item of opname.items) {
        const difference = item.physicalStock - item.systemStock;

        if (difference === 0) {
          continue;
        }

        await tx.inventoryStock.upsert({
          where: {
            inventoryItemId_warehouseId: {
              inventoryItemId: item.inventoryItemId,
              warehouseId: opname.warehouseId,
            },
          },
          update: {
            quantity: item.physicalStock,
          },
          create: {
            inventoryItemId: item.inventoryItemId,
            warehouseId: opname.warehouseId,
            quantity: item.physicalStock,
          },
        });

        await tx.stockTransaction.create({
          data: {
            transactionNumber: `STK-${Date.now()}-${item.id}`,
            transactionType: "ADJUSTMENT",
            inventoryItemId: item.inventoryItemId,
            warehouseId: opname.warehouseId,
            quantityChange: difference,
            stockBefore: item.systemStock,
            stockAfter: item.physicalStock,
            referenceNumber: opname.opnameNumber,
            notes: `Penyesuaian stok dari Stock Opname ${opname.opnameNumber}`,
            performedBy: req.user?.userId ? String(req.user.userId) : null,
          },
        });
      }

      const completed = await tx.stockOpname.update({
        where: { id },
        data: {
          status: "COMPLETED",
        },
        include: opnameInclude,
      });

      return completed;
    });

    return res.json({
      success: true,
      message: "Stock Opname berhasil diselesaikan dan stok telah disesuaikan",
      data: result,
    });
  } catch (error) {
    console.error("Complete Stock Opname Error:", error);

    const message = error.message || "Gagal menyelesaikan Stock Opname";

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

module.exports = {
  getStockOpnames,
  getStockOpnameById,
  createStockOpname,
  updateStockOpnameItem,
  completeStockOpname,
};

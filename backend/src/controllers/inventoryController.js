const prisma = require("../lib/prisma");

// GET /api/inventory
const getInventory = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = items.map((item) => {
      const totalStock = item.stocks.reduce(
        (total, stock) => total + stock.quantity,
        0,
      );

      return {
        ...item,
        totalStock,
        isLowStock: totalStock <= item.minimumStock,
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data inventory",
    });
  }
};

// POST /api/inventory
const createInventoryItem = async (req, res) => {
  try {
    const { itemCode, itemName, description, category, unit, minimumStock } =
      req.body;

    if (!itemCode || !itemName || !unit) {
      return res.status(400).json({
        success: false,
        message: "Kode barang, nama barang, dan satuan wajib diisi",
      });
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { itemCode },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Kode barang sudah digunakan",
      });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        itemCode,
        itemName,
        description,
        category,
        unit,
        minimumStock: Number(minimumStock) || 0,
      },
    });

    res.status(201).json({
      success: true,
      message: "Barang berhasil ditambahkan",
      data: item,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan barang",
    });
  }
};

// GET /api/inventory/:id
const getInventoryDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID barang tidak valid",
      });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Barang tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Inventory detail error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail barang",
    });
  }
};

// PUT /api/inventory/:id
const updateInventoryItem = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID barang tidak valid",
      });
    }

    const {
      itemCode,
      itemName,
      description,
      category,
      unit,
      minimumStock,
      isActive,
    } = req.body;

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Barang tidak ditemukan",
      });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        itemCode,
        itemName,
        description,
        category,
        unit,
        minimumStock:
          minimumStock !== undefined ? Number(minimumStock) : undefined,
        isActive,
      },
    });

    res.json({
      success: true,
      message: "Barang berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    console.error("Update inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui barang",
    });
  }
};

// GET /api/inventory/summary
const getInventorySummary = async (req, res) => {
  try {
    const [totalItems, stocks, lowStockItems] = await Promise.all([
      prisma.inventoryItem.count({
        where: { isActive: true },
      }),
      prisma.inventoryStock.aggregate({
        _sum: { quantity: true },
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        include: { stocks: true },
      }),
    ]);

    const lowStockCount = lowStockItems.filter((item) => {
      const total = item.stocks.reduce((sum, stock) => sum + stock.quantity, 0);

      return total <= item.minimumStock;
    }).length;

    res.json({
      success: true,
      data: {
        totalItems,
        totalStock: stocks._sum.quantity || 0,
        lowStockItems: lowStockCount,
      },
    });
  } catch (error) {
    console.error("Inventory summary error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan inventory",
    });
  }
};

module.exports = {
  getInventory,
  createInventoryItem,
  getInventoryDetail,
  updateInventoryItem,
  getInventorySummary,
};

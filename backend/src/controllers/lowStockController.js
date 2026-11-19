const prisma = require("../lib/prisma");

// GET /api/low-stock-alerts
// Mengambil peringatan untuk barang yang stoknya menipis atau habis.
const getLowStockAlerts = async (req, res) => {
  try {
    const { warehouseId, severity = "ALL" } = req.query;

    // Validasi filter gudang
    let parsedWarehouseId;

    if (warehouseId) {
      parsedWarehouseId = Number(warehouseId);

      if (!Number.isInteger(parsedWarehouseId) || parsedWarehouseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Warehouse ID tidak valid.",
        });
      }
    }

    // Ambil stok dari setiap gudang
    const stocks = await prisma.inventoryStock.findMany({
      where: {
        ...(parsedWarehouseId && {
          warehouseId: parsedWarehouseId,
        }),
        inventoryItem: {
          isActive: true,
        },
        warehouse: {
          isActive: true,
        },
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            itemCode: true,
            itemName: true,
            category: true,
            unit: true,
            minimumStock: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Bentuk daftar notifikasi
    let alerts = stocks
      .filter((stock) => stock.quantity <= stock.inventoryItem.minimumStock)
      .map((stock) => {
        const isOutOfStock = stock.quantity <= 0;

        return {
          id: `${stock.inventoryItemId}-${stock.warehouseId}`,
          inventoryItemId: stock.inventoryItemId,
          warehouseId: stock.warehouseId,
          itemCode: stock.inventoryItem.itemCode,
          itemName: stock.inventoryItem.itemName,
          category: stock.inventoryItem.category,
          unit: stock.inventoryItem.unit,
          currentStock: stock.quantity,
          minimumStock: stock.inventoryItem.minimumStock,
          warehouseCode: stock.warehouse.warehouseCode,
          warehouseName: stock.warehouse.warehouseName,
          severity: isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK",
          message: isOutOfStock
            ? "Stok barang sudah habis."
            : "Stok barang mencapai batas minimum.",
          updatedAt: stock.updatedAt,
        };
      });

    // Filter jenis notifikasi
    if (severity === "OUT_OF_STOCK" || severity === "LOW_STOCK") {
      alerts = alerts.filter((alert) => alert.severity === severity);
    } else if (severity !== "ALL") {
      return res.status(400).json({
        success: false,
        message: "Filter severity tidak valid.",
      });
    }

    const outOfStock = alerts.filter(
      (alert) => alert.severity === "OUT_OF_STOCK",
    ).length;

    const lowStock = alerts.filter(
      (alert) => alert.severity === "LOW_STOCK",
    ).length;

    return res.json({
      success: true,
      message: "Notifikasi stok berhasil diambil.",
      data: {
        summary: {
          totalAlerts: alerts.length,
          outOfStock,
          lowStock,
        },
        alerts,
      },
    });
  } catch (error) {
    console.error("Get Low Stock Alerts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil notifikasi stok.",
    });
  }
};

module.exports = {
  getLowStockAlerts,
};

const prisma = require("../lib/prisma");

// GET /api/warehouses
const getWarehouses = async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: {
            stocks: true,
            goodsReceipts: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data gudang",
    });
  }
};

// POST /api/warehouses
const createWarehouse = async (req, res) => {
  try {
    const { warehouseCode, warehouseName, address, description } = req.body;

    if (!warehouseCode || !warehouseName) {
      return res.status(400).json({
        success: false,
        message: "Kode dan nama gudang wajib diisi",
      });
    }

    const existing = await prisma.warehouse.findUnique({
      where: { warehouseCode },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Kode gudang sudah digunakan",
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        warehouseCode,
        warehouseName,
        address,
        description,
      },
    });

    res.status(201).json({
      success: true,
      message: "Gudang berhasil ditambahkan",
      data: warehouse,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan gudang",
    });
  }
};

// GET /api/warehouses/:id
const getWarehouseDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID gudang tidak valid",
      });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            inventoryItem: true,
          },
        },
        goodsReceipts: true,
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Gudang tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error("Get warehouse detail error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail gudang",
    });
  }
};

// PUT /api/warehouses/:id
const updateWarehouse = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID gudang tidak valid",
      });
    }

    const existing = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Gudang tidak ditemukan",
      });
    }

    const { warehouseCode, warehouseName, address, description, isActive } =
      req.body;

    if (warehouseCode) {
      const duplicate = await prisma.warehouse.findFirst({
        where: {
          warehouseCode,
          NOT: { id },
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Kode gudang sudah digunakan",
        });
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(warehouseCode !== undefined && { warehouseCode }),
        ...(warehouseName !== undefined && { warehouseName }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      message: "Gudang berhasil diperbarui",
      data: warehouse,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui gudang",
    });
  }
};

module.exports = {
  getWarehouses,
  createWarehouse,
  getWarehouseDetail,
  updateWarehouse,
};

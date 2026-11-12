const prisma = require("../lib/prisma");

// GET: Menampilkan semua requisitions
const getRequisitions = async (req, res) => {
  try {
    const { search, status } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { requestNumber: { contains: search } },
        { title: { contains: search } },
        { department: { contains: search } },
      ];
    }

    const requisitions = await prisma.requisition.findMany({
      where,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: requisitions,
    });
  } catch (error) {
    console.error("Get requisitions error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data requisitions.",
    });
  }
};

// GET: Menampilkan satu requisition berdasarkan ID
const getRequisitionById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const requisition = await prisma.requisition.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Requisition tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    console.error("Get requisition detail error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail requisition.",
    });
  }
};

// POST: Membuat requisition baru
const createRequisition = async (req, res) => {
  try {
    const { title, description, department, neededDate, items } = req.body;

    if (!title || !department || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Judul, departemen, dan minimal satu barang wajib diisi.",
      });
    }

    const invalidItem = items.some((item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.estimatedUnitPrice);

      return (
        !item.itemName ||
        !item.unit ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      );
    });

    if (invalidItem) {
      return res.status(400).json({
        success: false,
        message: "Periksa nama barang, satuan, jumlah, dan estimasi harga.",
      });
    }

    const parsedDate = neededDate ? new Date(neededDate) : null;

    if (parsedDate && Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Tanggal kebutuhan tidak valid.",
      });
    }

    const requisition = await prisma.requisition.create({
      data: {
        requestNumber: `REQ-${Date.now()}`,
        title: title.trim(),
        description: description || null,
        department: department.trim(),
        neededDate: parsedDate,
        requestedById: req.user.userId,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName.trim(),
            description: item.description || null,
            quantity: Number(item.quantity),
            unit: item.unit.trim(),
            estimatedUnitPrice: String(item.estimatedUnitPrice),
          })),
        },
      },
      include: {
        items: true,
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Requisition berhasil dibuat.",
      data: requisition,
    });
  } catch (error) {
    console.error("Create requisition error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat requisition.",
    });
  }
};

// PUT: Mengubah requisition yang masih berstatus DRAFT
const updateRequisition = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, department, neededDate, items } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const existing = await prisma.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Requisition tidak ditemukan.",
      });
    }

    if (existing.requestedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses untuk mengubah requisition ini.",
      });
    }

    if (existing.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Hanya requisition berstatus DRAFT yang dapat diubah.",
      });
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Minimal harus ada satu barang.",
        });
      }

      const invalidItem = items.some((item) => {
        const quantity = Number(item.quantity);
        const price = Number(item.estimatedUnitPrice);

        return (
          !item.itemName ||
          !item.unit ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(price) ||
          price < 0
        );
      });

      if (invalidItem) {
        return res.status(400).json({
          success: false,
          message: "Data barang tidak valid.",
        });
      }
    }

    let parsedDate;

    if (neededDate !== undefined) {
      parsedDate = neededDate ? new Date(neededDate) : null;

      if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Tanggal kebutuhan tidak valid.",
        });
      }
    }

    const updated = await prisma.requisition.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(department !== undefined && { department: department.trim() }),
        ...(neededDate !== undefined && { neededDate: parsedDate }),
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              itemName: item.itemName.trim(),
              description: item.description || null,
              quantity: Number(item.quantity),
              unit: item.unit.trim(),
              estimatedUnitPrice: String(item.estimatedUnitPrice),
            })),
          },
        }),
      },
      include: { items: true },
    });

    res.json({
      success: true,
      message: "Requisition berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    console.error("Update requisition error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui requisition.",
    });
  }
};

// DELETE: Menghapus requisition yang masih berstatus DRAFT
const deleteRequisition = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const existing = await prisma.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Requisition tidak ditemukan.",
      });
    }

    if (existing.requestedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses untuk menghapus requisition ini.",
      });
    }

    if (existing.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Hanya requisition berstatus DRAFT yang dapat dihapus.",
      });
    }

    await prisma.requisition.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Requisition berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete requisition error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus requisition.",
    });
  }
};

// POST: Mengajukan requisition untuk persetujuan
const submitRequisition = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const existing = await prisma.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Requisition tidak ditemukan.",
      });
    }

    if (existing.requestedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses untuk mengajukan requisition ini.",
      });
    }

    if (existing.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Hanya requisition berstatus DRAFT yang dapat diajukan.",
      });
    }

    const updated = await prisma.requisition.update({
      where: { id },
      data: { status: "PENDING" },
      include: { items: true },
    });

    res.json({
      success: true,
      message: "Requisition berhasil diajukan untuk persetujuan.",
      data: updated,
    });
  } catch (error) {
    console.error("Submit requisition error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengajukan requisition.",
    });
  }
};

module.exports = {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  submitRequisition,
};

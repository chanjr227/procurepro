const prisma = require("../lib/prisma");

const purchaseOrderInclude = {
  vendor: {
    select: {
      id: true,
      vendorCode: true,
      companyName: true,
      email: true,
      phone: true,
      address: true,
    },
  },
  requisition: {
    select: {
      id: true,
      requestNumber: true,
      title: true,
      department: true,
      neededDate: true,
      status: true,
      items: true,
    },
  },
  items: true,
};

const sendError = (res, error, fallback) => {
  console.error(fallback, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : fallback,
  });
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw createError("Nominal pembayaran tidak valid.");
  }

  return Math.round(number * 100) / 100;
};

const generatePONumber = () => {
  const year = new Date().getFullYear();
  return `PO-${year}-${Date.now()}`;
};

// GET /api/purchase-orders
const getPurchaseOrders = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const where = {};

    if (status) {
      const allowedStatuses = ["DRAFT", "SENT", "COMPLETED", "CANCELLED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Filter status tidak valid.",
        });
      }

      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        {
          poNumber: {
            contains: search.trim(),
          },
        },
        {
          vendor: {
            companyName: {
              contains: search.trim(),
            },
          },
        },
        {
          requisition: {
            requestNumber: {
              contains: search.trim(),
            },
          },
        },
      ];
    }

    const [orders, total, summary] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: purchaseOrderInclude,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.purchaseOrder.count({ where }),

      prisma.purchaseOrder.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      total,
      summary,
      data: orders,
    });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil daftar Purchase Orders.");
  }
};

// GET /api/purchase-orders/options
const getPurchaseOrderOptions = async (req, res) => {
  try {
    const [vendors, requisitions] = await Promise.all([
      prisma.vendor.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          vendorCode: true,
          companyName: true,
          email: true,
        },
        orderBy: {
          companyName: "asc",
        },
      }),

      prisma.requisition.findMany({
        where: {
          status: "APPROVED",
          purchaseOrder: null,
        },
        include: {
          items: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        vendors,
        requisitions,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Gagal mengambil pilihan Vendor dan Requisition.",
    );
  }
};

// GET /api/purchase-orders/:id
const getPurchaseOrderDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Purchase Order tidak valid.",
      });
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: purchaseOrderInclude,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil detail Purchase Order.");
  }
};

// POST /api/purchase-orders
const createPurchaseOrder = async (req, res) => {
  try {
    const requisitionId = Number(req.body.requisitionId);
    const vendorId = Number(req.body.vendorId);
    const tax = toMoney(req.body.tax ?? 0);
    const notes =
      typeof req.body.notes === "string" ? req.body.notes.trim() : null;

    const deliveryDate = req.body.deliveryDate
      ? new Date(req.body.deliveryDate)
      : null;

    if (
      !Number.isInteger(requisitionId) ||
      requisitionId <= 0 ||
      !Number.isInteger(vendorId) ||
      vendorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Requisition atau Vendor tidak valid.",
      });
    }

    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pengiriman tidak valid.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id: requisitionId },
        include: { items: true },
      });

      if (!requisition) {
        throw createError("Requisition tidak ditemukan.", 404);
      }

      if (requisition.status !== "APPROVED") {
        throw createError(
          "Purchase Order hanya dapat dibuat dari Requisition yang sudah disetujui.",
        );
      }

      if (!requisition.items.length) {
        throw createError("Requisition tidak memiliki item.");
      }

      const existingPO = await tx.purchaseOrder.findUnique({
        where: { requisitionId },
      });

      if (existingPO) {
        throw createError(
          "Requisition ini sudah memiliki Purchase Order.",
          409,
        );
      }

      const vendor = await tx.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor || vendor.status !== "ACTIVE") {
        throw createError("Vendor tidak ditemukan atau belum aktif.");
      }

      const inputItems = req.body.items;

      if (
        !Array.isArray(inputItems) ||
        inputItems.length !== requisition.items.length
      ) {
        throw createError("Daftar harga item tidak sesuai dengan Requisition.");
      }

      const items = requisition.items.map((source, index) => {
        const input = inputItems[index];

        const unitPrice = toMoney(input?.unitPrice);

        const totalPrice = Math.round(source.quantity * unitPrice * 100) / 100;

        return {
          itemName: source.itemName,
          description: source.description,
          quantity: source.quantity,
          unit: source.unit,
          unitPrice,
          totalPrice,
        };
      });

      const subtotal =
        Math.round(
          items.reduce((sum, item) => sum + item.totalPrice, 0) * 100,
        ) / 100;

      const totalAmount = Math.round((subtotal + tax) * 100) / 100;

      const order = await tx.purchaseOrder.create({
        data: {
          poNumber: generatePONumber(),
          requisitionId,
          vendorId,
          deliveryDate,
          notes,
          subtotal,
          tax,
          totalAmount,
          status: "DRAFT",
          items: {
            create: items,
          },
        },
        include: purchaseOrderInclude,
      });

      return order;
    });

    return res.status(201).json({
      success: true,
      message: "Purchase Order berhasil dibuat.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "Gagal membuat Purchase Order.");
  }
};

// PUT /api/purchase-orders/:id
const updatePurchaseOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Purchase Order tidak valid.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        throw createError("Purchase Order tidak ditemukan.", 404);
      }

      if (existing.status !== "DRAFT") {
        throw createError(
          "Hanya Purchase Order berstatus DRAFT yang dapat diedit.",
        );
      }

      const data = {};

      if (req.body.vendorId !== undefined) {
        const vendorId = Number(req.body.vendorId);

        const vendor = await tx.vendor.findUnique({
          where: { id: vendorId },
        });

        if (!vendor || vendor.status !== "ACTIVE") {
          throw createError("Vendor tidak aktif atau tidak ditemukan.");
        }

        data.vendorId = vendorId;
      }

      if (req.body.notes !== undefined) {
        data.notes =
          typeof req.body.notes === "string"
            ? req.body.notes.trim() || null
            : null;
      }

      if (req.body.deliveryDate !== undefined) {
        const date = req.body.deliveryDate
          ? new Date(req.body.deliveryDate)
          : null;

        if (date && Number.isNaN(date.getTime())) {
          throw createError("Tanggal pengiriman tidak valid.");
        }

        data.deliveryDate = date;
      }

      if (req.body.items !== undefined) {
        if (
          !Array.isArray(req.body.items) ||
          req.body.items.length !== existing.items.length
        ) {
          throw createError("Jumlah item tidak boleh diubah.");
        }

        const items = existing.items.map((source, index) => {
          const input = req.body.items[index];
          const unitPrice = toMoney(input?.unitPrice);

          return {
            itemName: source.itemName,
            description: source.description,
            quantity: source.quantity,
            unit: source.unit,
            unitPrice,
            totalPrice: Math.round(source.quantity * unitPrice * 100) / 100,
          };
        });

        data.subtotal =
          Math.round(
            items.reduce((sum, item) => sum + item.totalPrice, 0) * 100,
          ) / 100;

        const tax =
          req.body.tax !== undefined
            ? toMoney(req.body.tax)
            : Number(existing.tax);

        data.tax = tax;
        data.totalAmount = Math.round((data.subtotal + tax) * 100) / 100;

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        data.items = {
          create: items,
        };
      } else if (req.body.tax !== undefined) {
        const tax = toMoney(req.body.tax);

        data.tax = tax;
        data.totalAmount =
          Math.round((Number(existing.subtotal) + tax) * 100) / 100;
      }

      return tx.purchaseOrder.update({
        where: { id },
        data,
        include: purchaseOrderInclude,
      });
    });

    return res.json({
      success: true,
      message: "Purchase Order berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui Purchase Order.");
  }
};

// PATCH /api/purchase-orders/:id/status
const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ["DRAFT", "SENT", "COMPLETED", "CANCELLED"];

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Purchase Order tidak valid.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status Purchase Order tidak valid.",
      });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order tidak ditemukan.",
      });
    }

    const transitions = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!transitions[existing.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak dapat diubah dari ${existing.status} ke ${status}.`,
      });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: purchaseOrderInclude,
    });

    return res.json({
      success: true,
      message: "Status Purchase Order berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui status Purchase Order.");
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderOptions,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
};

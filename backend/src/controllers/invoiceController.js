const prisma = require("../lib/prisma");

// =====================================================
// RELATIONS
// =====================================================
const invoiceInclude = {
  vendor: true,
  purchaseOrder: {
    include: {
      items: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  verifiedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    include: {
      purchaseOrderItem: true,
    },
  },
};

// =====================================================
// HELPERS
// =====================================================
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getUserId = (user) => {
  const userId = Number(user?.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw createError("Informasi pengguna tidak valid.", 401);
  }

  return userId;
};

const toNumber = (value) => Number(value || 0);

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getInvoiceNumber = () => `INV-${Date.now()}`;

// =====================================================
// THREE-WAY MATCHING
// =====================================================
const calculateInvoiceMatching = async (tx, invoiceId) => {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      purchaseOrder: true,
      items: {
        include: {
          purchaseOrderItem: true,
        },
      },
    },
  });

  if (!invoice) {
    throw createError("Invoice tidak ditemukan.", 404);
  }

  const matchingItems = [];

  for (const item of invoice.items) {
    const poItem = item.purchaseOrderItem;

    const received = await tx.goodsReceiptItem.aggregate({
      where: {
        purchaseOrderItemId: poItem.id,
        goodsReceipt: {
          is: {
            purchaseOrderId: invoice.purchaseOrderId,
          },
        },
      },
      _sum: {
        quantityReceived: true,
      },
    });

    const receivedQuantity = received._sum.quantityReceived || 0;

    const invoiced = await tx.invoiceItem.aggregate({
      where: {
        purchaseOrderItemId: poItem.id,
        invoiceId: {
          not: invoice.id,
        },
        invoice: {
          is: {
            purchaseOrderId: invoice.purchaseOrderId,
            status: {
              not: "REJECTED",
            },
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const previousInvoiceQuantity = invoiced._sum.quantity || 0;

    const availableQuantity = Math.max(
      0,
      receivedQuantity - previousInvoiceQuantity,
    );

    const quantityMatch = item.quantity <= availableQuantity;

    const priceMatch =
      roundMoney(toNumber(item.unitPrice)) ===
      roundMoney(toNumber(poItem.unitPrice));

    matchingItems.push({
      invoiceItemId: item.id,
      purchaseOrderItemId: poItem.id,
      itemName: poItem.itemName,
      unit: poItem.unit,

      orderedQuantity: poItem.quantity,
      receivedQuantity,
      previousInvoiceQuantity,
      availableQuantity,
      invoiceQuantity: item.quantity,

      poUnitPrice: toNumber(poItem.unitPrice),
      invoiceUnitPrice: toNumber(item.unitPrice),

      quantityMatch,
      priceMatch,
      matched: quantityMatch && priceMatch,
    });
  }

  const allMatched =
    matchingItems.length > 0 && matchingItems.every((item) => item.matched);

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    purchaseOrderNumber: invoice.purchaseOrder.poNumber,
    status: invoice.status,
    allMatched,
    items: matchingItems,
  };
};

// =====================================================
// GET INVOICES
// GET /api/invoices
// =====================================================
const getInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search?.trim()) {
      const keyword = search.trim();

      where.OR = [
        {
          invoiceNumber: {
            contains: keyword,
          },
        },
        {
          vendorInvoiceNumber: {
            contains: keyword,
          },
        },
        {
          vendor: {
            companyName: {
              contains: keyword,
            },
          },
        },
        {
          purchaseOrder: {
            poNumber: {
              contains: keyword,
            },
          },
        },
      ];
    }

    const [invoices, grouped] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.invoice.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: invoices,
      summary: grouped,
    });
  } catch (error) {
    console.error("Get Invoices Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data Invoice.",
    });
  }
};

// =====================================================
// GET INVOICE OPTIONS
// GET /api/invoices/options
// =====================================================
const getInvoiceOptions = async (req, res) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        vendor: true,
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const options = [];

    for (const po of purchaseOrders) {
      const availableItems = [];

      for (const poItem of po.items) {
        const received = await prisma.goodsReceiptItem.aggregate({
          where: {
            purchaseOrderItemId: poItem.id,
            goodsReceipt: {
              is: {
                purchaseOrderId: po.id,
              },
            },
          },
          _sum: {
            quantityReceived: true,
          },
        });

        const invoiced = await prisma.invoiceItem.aggregate({
          where: {
            purchaseOrderItemId: poItem.id,
            invoice: {
              is: {
                purchaseOrderId: po.id,
                status: {
                  not: "REJECTED",
                },
              },
            },
          },
          _sum: {
            quantity: true,
          },
        });

        const receivedQuantity = received._sum.quantityReceived || 0;
        const invoicedQuantity = invoiced._sum.quantity || 0;

        const remainingQuantity = Math.max(
          0,
          receivedQuantity - invoicedQuantity,
        );

        if (remainingQuantity > 0) {
          availableItems.push({
            ...poItem,
            receivedQuantity,
            invoicedQuantity,
            remainingQuantity,
          });
        }
      }

      if (availableItems.length > 0) {
        options.push({
          ...po,
          items: availableItems,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error("Get Invoice Options Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pilihan Purchase Order.",
    });
  }
};

// =====================================================
// GET INVOICE DETAIL
// GET /api/invoices/:id
// =====================================================
const getInvoiceDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Invoice tidak valid.");
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw createError("Invoice tidak ditemukan.", 404);
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Get Invoice Detail Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal mengambil detail Invoice.",
    });
  }
};

// =====================================================
// CREATE INVOICE
// POST /api/invoices
// =====================================================
const createInvoice = async (req, res) => {
  try {
    const {
      purchaseOrderId,
      vendorInvoiceNumber,
      invoiceDate,
      dueDate,
      tax = 0,
      notes,
      items,
    } = req.body;

    const poId = Number(purchaseOrderId);
    const userId = getUserId(req.user);

    if (!Number.isInteger(poId) || poId <= 0) {
      throw createError("Purchase Order wajib dipilih.");
    }

    if (!invoiceDate || Number.isNaN(new Date(invoiceDate).getTime())) {
      throw createError("Tanggal Invoice tidak valid.");
    }

    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
      throw createError("Tanggal jatuh tempo tidak valid.");
    }

    const taxAmount = Number(tax);

    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      throw createError("Nilai pajak tidak valid.");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw createError("Minimal satu barang harus dimasukkan.");
    }

    const validatedItems = items.map((item) => {
      const purchaseOrderItemId = Number(item.purchaseOrderItemId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isInteger(purchaseOrderItemId) || purchaseOrderItemId <= 0) {
        throw createError("Purchase Order Item ID tidak valid.");
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw createError("Jumlah barang harus lebih dari 0.");
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw createError("Harga barang tidak valid.");
      }

      return {
        purchaseOrderItemId,
        quantity,
        unitPrice: roundMoney(unitPrice),
      };
    });

    const ids = validatedItems.map((item) => item.purchaseOrderItemId);

    if (new Set(ids).size !== ids.length) {
      throw createError("Barang yang sama tidak boleh dimasukkan dua kali.");
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: poId },
          include: {
            items: true,
          },
        });

        if (!po) {
          throw createError("Purchase Order tidak ditemukan.", 404);
        }

        if (po.status !== "COMPLETED") {
          throw createError(
            "Invoice hanya dapat dibuat untuk Purchase Order berstatus COMPLETED.",
          );
        }

        const preparedItems = [];

        for (const item of validatedItems) {
          const poItem = po.items.find(
            (entry) => entry.id === item.purchaseOrderItemId,
          );

          if (!poItem) {
            throw createError(
              "Barang bukan bagian dari Purchase Order yang dipilih.",
            );
          }

          const received = await tx.goodsReceiptItem.aggregate({
            where: {
              purchaseOrderItemId: poItem.id,
              goodsReceipt: {
                is: {
                  purchaseOrderId: poId,
                },
              },
            },
            _sum: {
              quantityReceived: true,
            },
          });

          const invoiced = await tx.invoiceItem.aggregate({
            where: {
              purchaseOrderItemId: poItem.id,
              invoice: {
                is: {
                  purchaseOrderId: poId,
                  status: {
                    not: "REJECTED",
                  },
                },
              },
            },
            _sum: {
              quantity: true,
            },
          });

          const receivedQuantity = received._sum.quantityReceived || 0;
          const invoicedQuantity = invoiced._sum.quantity || 0;

          const remainingQuantity = Math.max(
            0,
            receivedQuantity - invoicedQuantity,
          );

          if (item.quantity > remainingQuantity) {
            throw createError(
              `Jumlah invoice ${poItem.itemName} melebihi sisa barang yang dapat ditagihkan. Sisa: ${remainingQuantity}.`,
            );
          }

          if (
            roundMoney(item.unitPrice) !==
            roundMoney(toNumber(poItem.unitPrice))
          ) {
            throw createError(
              `Harga ${poItem.itemName} tidak sesuai dengan Purchase Order.`,
            );
          }

          preparedItems.push({
            purchaseOrderItemId: poItem.id,
            itemName: poItem.itemName,
            quantity: item.quantity,
            unit: poItem.unit,
            unitPrice: item.unitPrice,
            totalPrice: roundMoney(item.quantity * item.unitPrice),
          });
        }

        const subtotal = roundMoney(
          preparedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        );

        const totalAmount = roundMoney(subtotal + taxAmount);

        return tx.invoice.create({
          data: {
            invoiceNumber: getInvoiceNumber(),
            vendorInvoiceNumber: vendorInvoiceNumber?.trim() || null,
            vendorId: po.vendorId,
            purchaseOrderId: poId,
            invoiceDate: new Date(invoiceDate),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: "PENDING",
            subtotal,
            tax: taxAmount,
            totalAmount,
            notes: notes?.trim() || null,
            createdById: userId,
            items: {
              create: preparedItems,
            },
          },
          include: invoiceInclude,
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    return res.status(201).json({
      success: true,
      message: "Invoice berhasil dibuat dan menunggu verifikasi.",
      data: result,
    });
  } catch (error) {
    console.error("Create Invoice Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal membuat Invoice.",
    });
  }
};

// =====================================================
// THREE-WAY MATCHING
// GET /api/invoices/:id/matching
// =====================================================
const getInvoiceMatching = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Invoice tidak valid.");
    }

    const matching = await calculateInvoiceMatching(prisma, id);

    return res.status(200).json({
      success: true,
      data: matching,
    });
  } catch (error) {
    console.error("Invoice Matching Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal melakukan Three-Way Matching.",
    });
  }
};

// =====================================================
// VERIFY INVOICE
// PATCH /api/invoices/:id/verify
// =====================================================
const verifyInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = getUserId(req.user);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Invoice tidak valid.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        throw createError("Invoice tidak ditemukan.", 404);
      }

      if (invoice.status !== "PENDING") {
        throw createError("Hanya Invoice PENDING yang dapat diverifikasi.");
      }

      const matching = await calculateInvoiceMatching(tx, id);

      if (!matching.allMatched) {
        throw createError(
          "Invoice gagal Three-Way Matching. Periksa jumlah dan harga barang.",
        );
      }

      return tx.invoice.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedById: userId,
          verifiedAt: new Date(),
        },
        include: invoiceInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Invoice berhasil diverifikasi.",
      data: result,
    });
  } catch (error) {
    console.error("Verify Invoice Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal memverifikasi Invoice.",
    });
  }
};

// =====================================================
// REJECT INVOICE
// PATCH /api/invoices/:id/reject
// =====================================================
const rejectInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Invoice tidak valid.");
    }

    if (!rejectionReason?.trim()) {
      throw createError("Alasan penolakan wajib diisi.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        throw createError("Invoice tidak ditemukan.", 404);
      }

      if (!["DRAFT", "PENDING"].includes(invoice.status)) {
        throw createError("Invoice ini tidak dapat ditolak.");
      }

      return tx.invoice.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        },
        include: invoiceInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Invoice berhasil ditolak.",
      data: result,
    });
  } catch (error) {
    console.error("Reject Invoice Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal menolak Invoice.",
    });
  }
};

// =====================================================
// PAY INVOICE
// PATCH /api/invoices/:id/pay
// =====================================================
const payInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Invoice tidak valid.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        throw createError("Invoice tidak ditemukan.", 404);
      }

      if (invoice.status !== "VERIFIED") {
        throw createError("Invoice harus berstatus VERIFIED sebelum dibayar.");
      }

      return tx.invoice.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
        include: invoiceInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Invoice berhasil ditandai sebagai PAID.",
      data: result,
    });
  } catch (error) {
    console.error("Pay Invoice Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal memproses pembayaran Invoice.",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  getInvoices,
  getInvoiceOptions,
  getInvoiceDetail,
  createInvoice,
  getInvoiceMatching,
  verifyInvoice,
  rejectInvoice,
  payInvoice,
};

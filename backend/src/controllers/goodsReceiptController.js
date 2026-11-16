const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

const receiptInclude = {
  purchaseOrder: {
    include: {
      vendor: true,
      items: true,
    },
  },
  items: {
    include: {
      purchaseOrderItem: true,
    },
  },
};

// GET /api/goods-receipts
const getGoodsReceipts = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        {
          purchaseOrder: {
            poNumber: { contains: search },
          },
        },
        {
          purchaseOrder: {
            vendor: {
              companyName: { contains: search },
            },
          },
        },
      ];
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where,
      include: receiptInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    console.error("Get goods receipts error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data penerimaan barang.",
    });
  }
};

// GET /api/goods-receipts/options
// Mengambil Purchase Order yang masih bisa menerima barang.
const getGoodsReceiptOptions = async (req, res) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: "SENT",
      },
      include: {
        vendor: true,
        items: {
          include: {
            goodsReceiptItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = purchaseOrders
      .map((po) => {
        const items = po.items
          .map((item) => {
            const quantityReceivedBefore = item.goodsReceiptItems.reduce(
              (total, receiptItem) => total + receiptItem.quantityReceived,
              0,
            );

            return {
              ...item,
              quantityReceivedBefore,
              remainingQuantity: Math.max(
                0,
                item.quantity - quantityReceivedBefore,
              ),
            };
          })
          .filter((item) => item.remainingQuantity > 0);

        return {
          ...po,
          items,
        };
      })
      .filter((po) => po.items.length > 0);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get goods receipt options error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil pilihan Purchase Order.",
    });
  }
};

// GET /api/goods-receipts/:id
const getGoodsReceiptDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID penerimaan tidak valid.",
      });
    }

    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: receiptInclude,
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Data penerimaan barang tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error("Get goods receipt detail error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail penerimaan barang.",
    });
  }
};

// POST /api/goods-receipts
const createGoodsReceipt = async (req, res) => {
  try {
    const { purchaseOrderId, receivedDate, notes, items } = req.body;

    const poId = Number(purchaseOrderId);

    if (!Number.isInteger(poId) || poId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order wajib dipilih.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu item penerimaan harus diisi.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          items: {
            include: {
              goodsReceiptItems: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new Error("Purchase Order tidak ditemukan.");
      }

      if (purchaseOrder.status !== "SENT") {
        throw new Error(
          "Purchase Order harus berstatus SENT untuk menerima barang.",
        );
      }

      const submittedItemIds = new Set();

      const receiptItems = items.map((item) => {
        const purchaseOrderItemId = Number(item.purchaseOrderItemId);
        const quantityReceived = Number(item.quantityReceived ?? 0);
        const quantityDamaged = Number(item.quantityDamaged ?? 0);

        if (
          !Number.isInteger(purchaseOrderItemId) ||
          !Number.isInteger(quantityReceived) ||
          !Number.isInteger(quantityDamaged) ||
          quantityReceived < 0 ||
          quantityDamaged < 0 ||
          quantityReceived + quantityDamaged <= 0
        ) {
          throw new Error("Jumlah barang diterima atau rusak tidak valid.");
        }

        if (submittedItemIds.has(purchaseOrderItemId)) {
          throw new Error("Item yang sama tidak boleh dimasukkan dua kali.");
        }

        submittedItemIds.add(purchaseOrderItemId);

        const poItem = purchaseOrder.items.find(
          (entry) => entry.id === purchaseOrderItemId,
        );

        if (!poItem) {
          throw new Error(
            "Item yang dipilih bukan bagian dari Purchase Order ini.",
          );
        }

        const previousQuantity = poItem.goodsReceiptItems.reduce(
          (total, receiptItem) => total + receiptItem.quantityReceived,
          0,
        );

        if (previousQuantity + quantityReceived > poItem.quantity) {
          throw new Error(
            `Jumlah barang baik untuk ${poItem.itemName} melebihi jumlah pesanan.`,
          );
        }

        return {
          purchaseOrderItemId,
          quantityReceived,
          quantityDamaged,
          notes: item.notes ? String(item.notes) : null,
        };
      });

      const receiptNumber = `GR-${new Date().getFullYear()}-${Date.now()}`;

      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: poId,
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy: String(req.user?.userId ?? "Admin"),
          notes: notes ? String(notes) : null,
          status: "PARTIAL",
          items: {
            create: receiptItems,
          },
        },
        include: receiptInclude,
      });

      // Periksa apakah seluruh jumlah pesanan sudah diterima atau dicatat rusak.
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: poId },
        include: {
          goodsReceiptItems: true,
        },
      });

      const allItemsFulfilled = updatedItems.every((poItem) => {
        const totalReceived = poItem.goodsReceiptItems.reduce(
          (total, receiptItem) => total + receiptItem.quantityReceived,
          0,
        );

        return totalReceived >= poItem.quantity;
      });

      const updatedReceipt = await tx.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
          status: allItemsFulfilled ? "COMPLETED" : "PARTIAL",
        },
        include: receiptInclude,
      });

      if (allItemsFulfilled) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: "COMPLETED" },
        });
      }

      return updatedReceipt;
    });

    res.status(201).json({
      success: true,
      message: "Penerimaan barang berhasil dibuat.",
      data: result,
    });
  } catch (error) {
    console.error("Create goods receipt error:", error);

    const message = error.message || "Gagal membuat penerimaan barang.";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

module.exports = {
  getGoodsReceipts,
  getGoodsReceiptOptions,
  getGoodsReceiptDetail,
  createGoodsReceipt,
};

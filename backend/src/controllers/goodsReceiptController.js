const prisma = require("../lib/prisma");

// =====================================================
// RELATIONS
// =====================================================
const receiptInclude = {
  purchaseOrder: {
    include: {
      vendor: true,
      items: {
        include: {
          inventoryItem: true,
        },
      },
    },
  },
  warehouse: true,
  items: {
    include: {
      purchaseOrderItem: {
        include: {
          inventoryItem: true,
        },
      },
      stockTransaction: true,
    },
  },
};

// =====================================================
// HELPER
// =====================================================
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getUserName = (user) => {
  return String(user?.name || user?.userId || "System");
};

// =====================================================
// GET GOODS RECEIPTS
// GET /api/goods-receipts
// =====================================================
const getGoodsReceipts = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search?.trim()) {
      where.OR = [
        {
          receiptNumber: {
            contains: search.trim(),
          },
        },
        {
          purchaseOrder: {
            poNumber: {
              contains: search.trim(),
            },
          },
        },
        {
          purchaseOrder: {
            vendor: {
              companyName: {
                contains: search.trim(),
              },
            },
          },
        },
      ];
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where,
      include: receiptInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    console.error("Get Goods Receipts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data Goods Receipt.",
    });
  }
};

// =====================================================
// GET GOODS RECEIPT OPTIONS
// GET /api/goods-receipts/options
// =====================================================
const getGoodsReceiptOptions = async (req, res) => {
  try {
    const [purchaseOrders, warehouses] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: {
          status: "SENT",
        },
        include: {
          vendor: true,
          items: {
            include: {
              inventoryItem: true,
              goodsReceiptItems: {
                include: {
                  goodsReceipt: {
                    select: {
                      purchaseOrderId: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.warehouse.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          warehouseName: "asc",
        },
      }),
    ]);

    const options = purchaseOrders
      .map((po) => {
        const items = po.items.map((item) => {
          const quantityReceivedBefore = item.goodsReceiptItems.reduce(
            (total, receiptItem) => {
              if (receiptItem.goodsReceipt?.purchaseOrderId === po.id) {
                return total + receiptItem.quantityReceived;
              }

              return total;
            },
            0,
          );

          const remainingQuantity = Math.max(
            0,
            item.quantity - quantityReceivedBefore,
          );

          return {
            ...item,
            quantityReceivedBefore,
            remainingQuantity,
          };
        });

        return {
          ...po,
          items: items.filter((item) => item.remainingQuantity > 0),
        };
      })
      .filter((po) => po.items.length > 0);

    return res.status(200).json({
      success: true,
      data: options,
      warehouses,
    });
  } catch (error) {
    console.error("Get Goods Receipt Options Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pilihan Goods Receipt.",
    });
  }
};

// =====================================================
// GET GOODS RECEIPT DETAIL
// GET /api/goods-receipts/:id
// =====================================================
const getGoodsReceiptDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("ID Goods Receipt tidak valid.");
    }

    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: receiptInclude,
    });

    if (!receipt) {
      throw createError("Goods Receipt tidak ditemukan.", 404);
    }

    return res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error("Get Goods Receipt Detail Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal mengambil detail Goods Receipt.",
    });
  }
};

// =====================================================
// CREATE GOODS RECEIPT
// POST /api/goods-receipts
// =====================================================
const createGoodsReceipt = async (req, res) => {
  try {
    const { purchaseOrderId, warehouseId, receivedDate, notes, items } =
      req.body;

    const poId = Number(purchaseOrderId);
    const whId = Number(warehouseId);

    // -----------------------------------------------
    // VALIDATE PURCHASE ORDER
    // -----------------------------------------------
    if (!Number.isInteger(poId) || poId <= 0) {
      throw createError("Purchase Order wajib dipilih.");
    }

    // -----------------------------------------------
    // VALIDATE WAREHOUSE
    // -----------------------------------------------
    if (!Number.isInteger(whId) || whId <= 0) {
      throw createError("Gudang wajib dipilih.");
    }

    // -----------------------------------------------
    // VALIDATE ITEMS
    // -----------------------------------------------
    if (!Array.isArray(items) || items.length === 0) {
      throw createError("Minimal satu barang harus dimasukkan.");
    }

    // -----------------------------------------------
    // VALIDATE DATE
    // -----------------------------------------------
    const parsedDate = receivedDate ? new Date(receivedDate) : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      throw createError("Tanggal penerimaan tidak valid.");
    }

    // -----------------------------------------------
    // VALIDATE ITEM QUANTITIES
    // -----------------------------------------------
    const validatedItems = items.map((item) => {
      const purchaseOrderItemId = Number(item.purchaseOrderItemId);

      const quantityReceived = Number(item.quantityReceived ?? 0);

      const quantityDamaged = Number(item.quantityDamaged ?? 0);

      if (!Number.isInteger(purchaseOrderItemId) || purchaseOrderItemId <= 0) {
        throw createError("Purchase Order Item ID tidak valid.");
      }

      if (!Number.isInteger(quantityReceived) || quantityReceived < 0) {
        throw createError(
          "Jumlah diterima harus berupa bilangan bulat minimal 0.",
        );
      }

      if (!Number.isInteger(quantityDamaged) || quantityDamaged < 0) {
        throw createError(
          "Jumlah rusak harus berupa bilangan bulat minimal 0.",
        );
      }

      if (quantityReceived + quantityDamaged <= 0) {
        throw createError("Jumlah diterima dan rusak tidak boleh keduanya 0.");
      }

      return {
        purchaseOrderItemId,
        quantityReceived,
        quantityDamaged,
        notes: item.notes?.trim() || null,
      };
    });

    const itemIds = validatedItems.map((item) => item.purchaseOrderItemId);

    if (new Set(itemIds).size !== itemIds.length) {
      throw createError("Barang yang sama tidak boleh dimasukkan dua kali.");
    }

    // =================================================
    // DATABASE TRANSACTION
    // =================================================
    const result = await prisma.$transaction(
      async (tx) => {
        // ---------------------------------------------
        // 1. GET PURCHASE ORDER
        // ---------------------------------------------
        const purchaseOrder = await tx.purchaseOrder.findUnique({
          where: {
            id: poId,
          },
          include: {
            items: {
              include: {
                inventoryItem: true,
              },
            },
          },
        });

        if (!purchaseOrder) {
          throw createError("Purchase Order tidak ditemukan.", 404);
        }

        if (purchaseOrder.status !== "SENT") {
          throw createError(
            "Goods Receipt hanya dapat dibuat untuk Purchase Order berstatus SENT.",
          );
        }

        // ---------------------------------------------
        // 2. CHECK WAREHOUSE
        // ---------------------------------------------
        const warehouse = await tx.warehouse.findUnique({
          where: {
            id: whId,
          },
        });

        if (!warehouse || !warehouse.isActive) {
          throw createError("Gudang tidak ditemukan atau sedang tidak aktif.");
        }

        // ---------------------------------------------
        // 3. VALIDATE PO ITEMS
        // ---------------------------------------------
        const preparedItems = [];

        for (const item of validatedItems) {
          const poItem = purchaseOrder.items.find(
            (po) => po.id === item.purchaseOrderItemId,
          );

          if (!poItem) {
            throw createError(
              `Barang dengan ID ${item.purchaseOrderItemId} bukan bagian dari Purchase Order ini.`,
            );
          }

          const previousReceipts = await tx.goodsReceiptItem.aggregate({
            where: {
              purchaseOrderItemId: poItem.id,
              goodsReceipt: {
                purchaseOrderId: poId,
              },
            },
            _sum: {
              quantityReceived: true,
            },
          });

          const previousQuantity = previousReceipts._sum.quantityReceived || 0;

          const remainingQuantity = Math.max(
            0,
            poItem.quantity - previousQuantity,
          );

          // Jumlah baik + rusak tidak boleh melebihi sisa PO.
          if (
            item.quantityReceived + item.quantityDamaged >
            remainingQuantity
          ) {
            throw createError(
              `Jumlah diterima dan rusak untuk ${poItem.itemName} melebihi sisa pesanan. Sisa: ${remainingQuantity}.`,
            );
          }

          // -------------------------------------------
          // CHECK INVENTORY ITEM
          // -------------------------------------------
          if (item.quantityReceived > 0) {
            if (!poItem.inventoryItemId) {
              throw createError(
                `Barang ${poItem.itemName} belum dihubungkan dengan Inventory Item melalui Purchase Order.`,
              );
            }

            const inventoryItem = await tx.inventoryItem.findUnique({
              where: {
                id: poItem.inventoryItemId,
              },
            });

            if (!inventoryItem || !inventoryItem.isActive) {
              throw createError(
                `Inventory Item untuk ${poItem.itemName} tidak ditemukan atau tidak aktif.`,
              );
            }
          }

          preparedItems.push({
            ...item,
            purchaseOrderItem: poItem,
          });
        }

        // ---------------------------------------------
        // 4. CREATE RECEIPT
        // ---------------------------------------------
        const receipt = await tx.goodsReceipt.create({
          data: {
            receiptNumber: `GR-${Date.now()}`,
            purchaseOrderId: poId,
            warehouseId: whId,
            receivedDate: parsedDate,
            receivedBy: getUserName(req.user),
            notes: notes?.trim() || null,
            status: "PARTIAL",
            items: {
              create: preparedItems.map((item) => ({
                purchaseOrderItemId: item.purchaseOrderItemId,
                quantityReceived: item.quantityReceived,
                quantityDamaged: item.quantityDamaged,
                notes: item.notes,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // ---------------------------------------------
        // 5. UPDATE INVENTORY STOCK
        // ---------------------------------------------
        for (const receiptItem of receipt.items) {
          const preparedItem = preparedItems.find(
            (item) =>
              item.purchaseOrderItemId === receiptItem.purchaseOrderItemId,
          );

          const acceptedQuantity = receiptItem.quantityReceived;

          // Barang rusak tidak masuk stok.
          if (acceptedQuantity <= 0) {
            continue;
          }

          const inventoryItemId =
            preparedItem.purchaseOrderItem.inventoryItemId;

          const existingStock = await tx.inventoryStock.findUnique({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId,
                warehouseId: whId,
              },
            },
          });

          const stockBefore = existingStock ? existingStock.quantity : 0;

          const stockAfter = stockBefore + acceptedQuantity;

          await tx.inventoryStock.upsert({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId,
                warehouseId: whId,
              },
            },
            update: {
              quantity: {
                increment: acceptedQuantity,
              },
            },
            create: {
              inventoryItemId,
              warehouseId: whId,
              quantity: acceptedQuantity,
            },
          });

          // -------------------------------------------
          // CREATE STOCK TRANSACTION
          // -------------------------------------------
          await tx.stockTransaction.create({
            data: {
              transactionNumber: `STK-GR-${receipt.id}-${receiptItem.id}`,
              transactionType: "IN",
              inventoryItemId,
              warehouseId: whId,
              quantityChange: acceptedQuantity,
              stockBefore,
              stockAfter,
              referenceNumber: receipt.receiptNumber,
              notes: `Penerimaan barang dari ${receipt.receiptNumber}`,
              performedBy: getUserName(req.user),
              goodsReceiptItemId: receiptItem.id,
            },
          });
        }

        // ---------------------------------------------
        // 6. CHECK PO COMPLETION
        // ---------------------------------------------
        let allItemsFulfilled = true;

        for (const poItem of purchaseOrder.items) {
          const totalReceipts = await tx.goodsReceiptItem.aggregate({
            where: {
              purchaseOrderItemId: poItem.id,
              goodsReceipt: {
                purchaseOrderId: poId,
              },
            },
            _sum: {
              quantityReceived: true,
            },
          });

          const totalAccepted = totalReceipts._sum.quantityReceived || 0;

          if (totalAccepted < poItem.quantity) {
            allItemsFulfilled = false;
            break;
          }
        }

        const newStatus = allItemsFulfilled ? "COMPLETED" : "PARTIAL";

        // ---------------------------------------------
        // 7. UPDATE RECEIPT STATUS
        // ---------------------------------------------
        await tx.goodsReceipt.update({
          where: {
            id: receipt.id,
          },
          data: {
            status: newStatus,
          },
        });

        // ---------------------------------------------
        // 8. UPDATE PO STATUS
        // ---------------------------------------------
        if (allItemsFulfilled) {
          await tx.purchaseOrder.update({
            where: {
              id: poId,
            },
            data: {
              status: "COMPLETED",
            },
          });
        }

        // ---------------------------------------------
        // 9. GET UPDATED RECEIPT
        // ---------------------------------------------
        return tx.goodsReceipt.findUnique({
          where: {
            id: receipt.id,
          },
          include: receiptInclude,
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    return res.status(201).json({
      success: true,
      message:
        "Goods Receipt berhasil dibuat dan stok Inventory berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    console.error("Create Goods Receipt Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal membuat Goods Receipt.",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  getGoodsReceipts,
  getGoodsReceiptOptions,
  getGoodsReceiptDetail,
  createGoodsReceipt,
};

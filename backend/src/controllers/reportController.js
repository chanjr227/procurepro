const prisma = require("../lib/prisma");

// Mengubah nilai Decimal Prisma menjadi number.
const toNumber = (value) => Number(value || 0);

// Membuat filter tanggal.
const getDateFilter = (from, to) => {
  const filter = {};

  if (from) {
    const start = new Date(`${from}T00:00:00.000`);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Format tanggal mulai tidak valid.");
    }
    filter.gte = start;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(end.getTime())) {
      throw new Error("Format tanggal akhir tidak valid.");
    }
    filter.lte = end;
  }

  if (from && to && new Date(from) > new Date(to)) {
    throw new Error("Tanggal mulai tidak boleh melebihi tanggal akhir.");
  }

  return Object.keys(filter).length ? filter : undefined;
};

// Mengambil laporan procurement dan inventory.
const getReports = async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = getDateFilter(from, to);

    const [
      requisitions,
      purchaseOrders,
      goodsReceipts,
      invoices,
      stockTransactions,
    ] = await Promise.all([
      prisma.requisition.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        include: {
          requestedBy: {
            select: { name: true },
          },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.purchaseOrder.findMany({
        where: dateFilter ? { orderDate: dateFilter } : {},
        include: {
          vendor: {
            select: { companyName: true },
          },
          items: true,
        },
        orderBy: { orderDate: "desc" },
      }),

      prisma.goodsReceipt.findMany({
        where: dateFilter ? { receivedDate: dateFilter } : {},
        include: {
          purchaseOrder: {
            include: {
              vendor: {
                select: { companyName: true },
              },
            },
          },
          warehouse: {
            select: { warehouseName: true },
          },
          items: {
            include: {
              purchaseOrderItem: {
                select: { itemName: true, unit: true },
              },
            },
          },
        },
        orderBy: { receivedDate: "desc" },
      }),

      prisma.invoice.findMany({
        where: dateFilter ? { invoiceDate: dateFilter } : {},
        include: {
          vendor: {
            select: { companyName: true },
          },
          purchaseOrder: {
            select: { poNumber: true },
          },
        },
        orderBy: { invoiceDate: "desc" },
      }),

      prisma.stockTransaction.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        include: {
          inventoryItem: {
            select: { itemCode: true, itemName: true, unit: true },
          },
          warehouse: {
            select: { warehouseName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalProcurement = purchaseOrders.reduce(
      (sum, po) => sum + toNumber(po.totalAmount),
      0,
    );

    const totalInvoice = invoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.totalAmount),
      0,
    );

    const paidInvoice = invoices
      .filter((invoice) => invoice.status === "PAID")
      .reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);

    const totalReceived = goodsReceipts.reduce(
      (sum, receipt) =>
        sum +
        receipt.items.reduce(
          (itemSum, item) => itemSum + item.quantityReceived,
          0,
        ),
      0,
    );

    const monthlyMap = {};

    purchaseOrders.forEach((po) => {
      const date = new Date(po.orderDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      monthlyMap[key] = (monthlyMap[key] || 0) + toNumber(po.totalAmount);
    });

    const monthlySpending = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount,
      }));

    const countStatus = (records) => {
      return records.reduce((result, record) => {
        result[record.status] = (result[record.status] || 0) + 1;
        return result;
      }, {});
    };

    res.json({
      success: true,
      message: "Laporan berhasil diambil.",
      data: {
        summary: {
          totalRequisitions: requisitions.length,
          approvedRequisitions: requisitions.filter(
            (item) => item.status === "APPROVED",
          ).length,
          totalPurchaseOrders: purchaseOrders.length,
          totalProcurement,
          totalGoodsReceipts: goodsReceipts.length,
          totalReceived,
          totalInvoices: invoices.length,
          totalInvoice,
          paidInvoice,
          unpaidInvoice: totalInvoice - paidInvoice,
          totalStockTransactions: stockTransactions.length,
        },

        statuses: {
          requisitions: countStatus(requisitions),
          purchaseOrders: countStatus(purchaseOrders),
          goodsReceipts: countStatus(goodsReceipts),
          invoices: countStatus(invoices),
        },

        monthlySpending,

        requisitions,
        purchaseOrders,
        goodsReceipts,
        invoices,
        stockTransactions,
      },
    });
  } catch (error) {
    console.error("Get Reports Error:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Gagal mengambil laporan.",
    });
  }
};

module.exports = { getReports };

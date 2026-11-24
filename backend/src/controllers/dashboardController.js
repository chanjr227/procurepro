const prisma = require("../lib/prisma");

const getDashboardSummary = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const requestedYear = Number(req.query.year || currentYear);

    const year =
      Number.isInteger(requestedYear) &&
      requestedYear >= 2000 &&
      requestedYear <= 2100
        ? requestedYear
        : currentYear;

    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    const [
      totalRequisitions,
      requisitionStatuses,
      activeVendors,
      totalPurchaseOrders,
      purchaseOrderStatuses,
      procurementAggregate,
      monthlyPurchaseOrders,
      recentPurchaseOrders,
      totalInventoryItems,
      stockAggregate,
      stocksWithItems,
      totalWarehouses,
      invoiceStatuses,
      unpaidInvoiceAggregate,
      recentRequisitions,
      recentGoodsReceipts,
      recentInvoices,
      recentStockTransactions,
    ] = await Promise.all([
      prisma.requisition.count(),

      prisma.requisition.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      prisma.vendor.count({
        where: { status: "ACTIVE" },
      }),

      prisma.purchaseOrder.count(),

      prisma.purchaseOrder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      prisma.purchaseOrder.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),

      prisma.purchaseOrder.findMany({
        where: {
          orderDate: {
            gte: startOfYear,
            lt: startOfNextYear,
          },
          status: { not: "CANCELLED" },
        },
        select: {
          orderDate: true,
          totalAmount: true,
        },
      }),

      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: {
            select: { companyName: true },
          },
        },
      }),

      prisma.inventoryItem.count({
        where: { isActive: true },
      }),

      prisma.inventoryStock.aggregate({
        _sum: { quantity: true },
      }),

      prisma.inventoryStock.findMany({
        where: {
          inventoryItem: { isActive: true },
        },
        select: {
          quantity: true,
          inventoryItem: {
            select: {
              minimumStock: true,
            },
          },
        },
      }),

      prisma.warehouse.count({
        where: { isActive: true },
      }),

      prisma.invoice.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      prisma.invoice.aggregate({
        where: {
          status: {
            notIn: ["PAID", "REJECTED"],
          },
        },
        _sum: { totalAmount: true },
      }),

      prisma.requisition.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          requestNumber: true,
          title: true,
          status: true,
          createdAt: true,
          requestedBy: {
            select: { name: true },
          },
        },
      }),

      prisma.goodsReceipt.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          receiptNumber: true,
          status: true,
          createdAt: true,
          purchaseOrder: {
            select: { poNumber: true },
          },
        },
      }),

      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          vendor: {
            select: { companyName: true },
          },
        },
      }),

      prisma.stockTransaction.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          transactionNumber: true,
          transactionType: true,
          quantityChange: true,
          createdAt: true,
          inventoryItem: {
            select: { itemName: true },
          },
          warehouse: {
            select: { warehouseName: true },
          },
        },
      }),
    ]);

    const countByStatus = (rows, status) =>
      rows.find((row) => row.status === status)?._count._all || 0;

    const requisitionSummary = {
      total: totalRequisitions,
      draft: countByStatus(requisitionStatuses, "DRAFT"),
      pending: countByStatus(requisitionStatuses, "PENDING"),
      approved: countByStatus(requisitionStatuses, "APPROVED"),
      rejected: countByStatus(requisitionStatuses, "REJECTED"),
      cancelled: countByStatus(requisitionStatuses, "CANCELLED"),
    };

    const purchaseOrderSummary = {
      total: totalPurchaseOrders,
      draft: countByStatus(purchaseOrderStatuses, "DRAFT"),
      sent: countByStatus(purchaseOrderStatuses, "SENT"),
      completed: countByStatus(purchaseOrderStatuses, "COMPLETED"),
      cancelled: countByStatus(purchaseOrderStatuses, "CANCELLED"),
    };

    const invoiceSummary = {
      total: invoiceStatuses.reduce((total, row) => total + row._count._all, 0),
      draft: countByStatus(invoiceStatuses, "DRAFT"),
      pending: countByStatus(invoiceStatuses, "PENDING"),
      verified: countByStatus(invoiceStatuses, "VERIFIED"),
      rejected: countByStatus(invoiceStatuses, "REJECTED"),
      paid: countByStatus(invoiceStatuses, "PAID"),
      unpaid: invoiceStatuses
        .filter((row) => !["PAID", "REJECTED"].includes(row.status))
        .reduce((total, row) => total + row._count._all, 0),
      unpaidAmount: Number(unpaidInvoiceAggregate._sum.totalAmount || 0),
    };

    const lowStockCount = stocksWithItems.filter(
      (stock) => stock.quantity <= stock.inventoryItem.minimumStock,
    ).length;

    const monthlySpending = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      amount: 0,
    }));

    monthlyPurchaseOrders.forEach((order) => {
      const month = order.orderDate.getMonth();
      monthlySpending[month].amount += Number(order.totalAmount || 0);
    });

    const recentActivities = [
      ...recentRequisitions.map((item) => ({
        id: `requisition-${item.id}`,
        type: "REQUISITION",
        title: "Requisition dibuat",
        detail: `${item.requestNumber} · ${item.title}`,
        status: item.status,
        actor: item.requestedBy.name,
        createdAt: item.createdAt,
      })),

      ...recentPurchaseOrders.map((item) => ({
        id: `purchase-order-${item.id}`,
        type: "PURCHASE_ORDER",
        title: "Purchase Order dibuat",
        detail: `${item.poNumber} · ${item.vendor.companyName}`,
        status: item.status,
        amount: Number(item.totalAmount),
        createdAt: item.createdAt,
      })),

      ...recentGoodsReceipts.map((item) => ({
        id: `goods-receipt-${item.id}`,
        type: "GOODS_RECEIPT",
        title: "Goods Receipt dibuat",
        detail: `${item.receiptNumber} · ${item.purchaseOrder.poNumber}`,
        status: item.status,
        createdAt: item.createdAt,
      })),

      ...recentInvoices.map((item) => ({
        id: `invoice-${item.id}`,
        type: "INVOICE",
        title: "Invoice dibuat",
        detail: `${item.invoiceNumber} · ${item.vendor.companyName}`,
        status: item.status,
        amount: Number(item.totalAmount),
        createdAt: item.createdAt,
      })),

      ...recentStockTransactions.map((item) => ({
        id: `stock-${item.id}`,
        type: "STOCK",
        title: `Transaksi stok ${item.transactionType}`,
        detail: `${item.inventoryItem.itemName} · ${item.warehouse.warehouseName}`,
        quantity: item.quantityChange,
        createdAt: item.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 8);

    return res.json({
      success: true,
      message: "Dashboard berhasil dimuat.",
      data: {
        year,
        statistics: {
          totalProcurement: Number(procurementAggregate._sum.totalAmount || 0),
          activeVendors,
          pendingApprovals: requisitionSummary.pending,
          totalPurchaseOrders,
        },
        requisitions: requisitionSummary,
        purchaseOrders: purchaseOrderSummary,
        procurementChart: monthlySpending,
        inventory: {
          totalItems: totalInventoryItems,
          totalStock: stockAggregate._sum.quantity || 0,
          lowStockItems: lowStockCount,
          totalWarehouses,
        },
        invoices: invoiceSummary,
        recentPurchaseOrders: recentPurchaseOrders.map((item) => ({
          id: item.id,
          poNumber: item.poNumber,
          vendor: item.vendor.companyName,
          date: item.orderDate,
          amount: Number(item.totalAmount),
          status: item.status,
        })),
        recentActivities,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard.",
    });
  }
};

module.exports = { getDashboardSummary };

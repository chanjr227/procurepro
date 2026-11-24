import { useEffect, useState } from "react";
import api from "../services/api";

import "../css/dashboard.css";
import "../css/notification.css";

import VendorManagement from "./VendorManagement";
import Requisitions from "./Requisitions";
import ApprovalManagement from "./ApprovalManagement";
import PurchaseOrders from "./PurchaseOrders";
import GoodsReceipt from "./GoodsReceipt";
import InventoryItems from "./InventoryItems";
import WarehouseManagement from "./Warehouse";
import InventoryStock from "./InventoryStock";
import StockTransactions from "./StockTransactions";
import StockOpname from "./StockOpname";
import Invoices from "./Invoices";
import Reports from "./Reports";
import UserManagement from "./UserManagement";

interface DashboardProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onNavigate: (page: string) => void;
  activePage: string;
}

interface LowStockAlert {
  id: string;
  itemName: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  warehouseName: string;
  severity: "OUT_OF_STOCK" | "LOW_STOCK";
  message: string;
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
}

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  detail: string;
  status?: string;
  actor?: string;
  amount?: number;
  quantity?: number;
  createdAt: string;
}

interface DashboardData {
  year: number;
  statistics: {
    totalProcurement: number;
    activeVendors: number;
    pendingApprovals: number;
    totalPurchaseOrders: number;
  };
  requisitions: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  purchaseOrders: {
    total: number;
    draft: number;
    sent: number;
    completed: number;
    cancelled: number;
  };
  procurementChart: {
    month: number;
    amount: number;
  }[];
  inventory: {
    totalItems: number;
    totalStock: number;
    lowStockItems: number;
    totalWarehouses: number;
  };
  invoices: {
    total: number;
    draft: number;
    pending: number;
    verified: number;
    rejected: number;
    paid: number;
    unpaid: number;
    unpaidAmount: number;
  };
  recentPurchaseOrders: {
    id: number;
    poNumber: string;
    vendor: string;
    date: string;
    amount: number;
    status: string;
  }[];
  recentActivities: DashboardActivity[];
}

const menuGroups = [
  {
    title: "MAIN MENU",
    items: [
      { label: "Dashboard", icon: "▦" },
      { label: "Vendors", icon: "♙" },
      { label: "Requisitions", icon: "▤" },
      { label: "Purchase Orders", icon: "▧" },
      { label: "Goods Receipt", icon: "📦" },
      { label: "Invoices", icon: "▥" },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Approvals", icon: "✓" },
      { label: "Reports", icon: "▥" },
      { label: "User Management", icon: "♧" },
    ],
  },
  {
    title: "INVENTORY MANAGEMENT",
    items: [
      { label: "Inventory Items", icon: "▤" },
      { label: "Warehouses", icon: "▦" },
      { label: "Inventory Stock", icon: "▧" },
      { label: "Stock Transactions", icon: "↔" },
      { label: "Stock Opname", icon: "✓" },
    ],
  },
];

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value || 0);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatRelativeTime = (date: string) => {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;

  return formatDate(date);
};

const emptyDashboardData = (year: number): DashboardData => ({
  year,
  statistics: {
    totalProcurement: 0,
    activeVendors: 0,
    pendingApprovals: 0,
    totalPurchaseOrders: 0,
  },
  requisitions: {
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  },
  purchaseOrders: {
    total: 0,
    draft: 0,
    sent: 0,
    completed: 0,
    cancelled: 0,
  },
  procurementChart: monthNames.map((_, index) => ({
    month: index + 1,
    amount: 0,
  })),
  inventory: {
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
    totalWarehouses: 0,
  },
  invoices: {
    total: 0,
    draft: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    paid: 0,
    unpaid: 0,
    unpaidAmount: 0,
  },
  recentPurchaseOrders: [],
  recentActivities: [],
});

export default function Dashboard({
  user,
  onLogout,
  onNavigate,
  activePage,
}: DashboardProps) {
  const currentYear = new Date().getFullYear();

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [dashboardData, setDashboardData] = useState<DashboardData>(
    emptyDashboardData(currentYear),
  );

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [lowStockSummary, setLowStockSummary] = useState({
    totalAlerts: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // Mengambil ringkasan dashboard sesuai tahun yang dipilih.
  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const response = await api.get(
          `/dashboard/summary?year=${selectedYear}`,
        );

        if (isMounted) {
          setDashboardData(response.data.data);
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);

        if (isMounted) {
          setDashboardError(
            "Data dashboard gagal dimuat. Periksa koneksi backend.",
          );
        }
      } finally {
        if (isMounted) {
          setDashboardLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  // Mengambil notifikasi sistem dan peringatan stok.
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const [stockResponse, notificationResponse] = await Promise.all([
          api.get("/low-stock-alerts"),
          api.get("/notifications"),
        ]);

        if (!isMounted) return;

        const stockData = stockResponse.data.data;
        const notificationData = notificationResponse.data.data;

        setAlerts(stockData.alerts || []);
        setLowStockSummary(
          stockData.summary || {
            totalAlerts: 0,
            outOfStock: 0,
            lowStock: 0,
          },
        );

        setAppNotifications(notificationData.notifications || []);
        setUnreadCount(notificationData.unreadCount || 0);
      } catch (error) {
        console.error("Gagal mengambil notifikasi:", error);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Menyesuaikan nama menu dengan halaman aktif.
  useEffect(() => {
    const pageMenuMap: Record<string, string> = {
      dashboard: "Dashboard",
      vendors: "Vendors",
      requisitions: "Requisitions",
      approvals: "Approvals",
      "purchase-orders": "Purchase Orders",
      "goods-receipts": "Goods Receipt",
      invoices: "Invoices",
      reports: "Reports",
      "inventory-items": "Inventory Items",
      warehouses: "Warehouses",
      "inventory-stock": "Inventory Stock",
      "stock-transactions": "Stock Transactions",
      "stock-opname": "Stock Opname",
      "user-management": "User Management",
    };

    setActiveMenu(pageMenuMap[activePage] || "Dashboard");
  }, [activePage]);

  const handleMenuClick = (label: string) => {
    const pageMap: Record<string, string> = {
      Dashboard: "dashboard",
      Vendors: "vendors",
      Requisitions: "requisitions",
      Approvals: "approvals",
      "Purchase Orders": "purchase-orders",
      "Goods Receipt": "goods-receipts",
      Invoices: "invoices",
      Reports: "reports",
      "Inventory Items": "inventory-items",
      Warehouses: "warehouses",
      "Inventory Stock": "inventory-stock",
      "Stock Transactions": "stock-transactions",
      "Stock Opname": "stock-opname",
      "User Management": "user-management",
    };

    if (pageMap[label]) {
      setActiveMenu(label);
      onNavigate(pageMap[label]);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification.id}/read`);

        setAppNotifications((previous) =>
          previous.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );

        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      console.error("Gagal menandai notifikasi:", error);
    }

    setShowNotifications(false);

    if (notification.referenceType === "REQUISITION") {
      onNavigate("approvals");
    }
  };

  const data = dashboardData;
  const maxChartValue = Math.max(
    ...data.procurementChart.map((item) => item.amount),
    1,
  );

  const filteredOrders = data.recentPurchaseOrders.filter((order) =>
    `${order.poNumber} ${order.vendor} ${order.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const notificationCount = lowStockSummary.totalAlerts + unreadCount;

  const statusItems = [
    {
      label: "Approved",
      value: data.requisitions.approved,
      className: "approved",
    },
    {
      label: "Pending",
      value: data.requisitions.pending,
      className: "pending",
    },
    {
      label: "Rejected",
      value: data.requisitions.rejected,
      className: "rejected",
    },
    { label: "Draft", value: data.requisitions.draft, className: "draft" },
    {
      label: "Cancelled",
      value: data.requisitions.cancelled,
      className: "cancelled",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "REQUISITION":
        return "▤";
      case "PURCHASE_ORDER":
        return "▧";
      case "GOODS_RECEIPT":
        return "📦";
      case "INVOICE":
        return "▥";
      case "STOCK":
        return "↔";
      default:
        return "•";
    }
  };

  const getStatusClass = (status: string) =>
    status.toLowerCase().replaceAll("_", "-");

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-logo">P</div>
          <div>
            <strong>ProcurePro</strong>
            <span>PROCUREMENT SYSTEM</span>
          </div>
        </div>

        <div className="sidebar-workspace">
          <span className="workspace-dot" />
          <div>
            <strong>Company Workspace</strong>
            <small>Enterprise Account</small>
          </div>
          <span className="workspace-arrow">⌄</span>
        </div>

        <nav className="sidebar-navigation">
          {menuGroups.map((group) => (
            <div className="menu-group" key={group.title}>
              <p className="menu-heading">{group.title}</p>

              {group.items.map((item) => (
                <button
                  key={item.label}
                  className={`sidebar-link ${
                    activeMenu === item.label ? "active" : ""
                  }`}
                  onClick={() => handleMenuClick(item.label)}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>

                  {item.label === "Approvals" &&
                    data.statistics.pendingApprovals > 0 && (
                      <span className="menu-count">
                        {data.statistics.pendingApprovals > 99
                          ? "99+"
                          : data.statistics.pendingApprovals}
                      </span>
                    )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span>{user.role || "User"}</span>
            </div>

            <button className="logout-button" onClick={onLogout} title="Logout">
              ⇥
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activeMenu}</strong>
          </div>

          <div className="topbar-actions">
            <label className="dashboard-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Cari purchase order..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="notification-wrapper">
              <button
                className="notification-button"
                title="Notifications"
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-expanded={showNotifications}
              >
                <span className="notification-bell">♧</span>

                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <div>
                      <h3>Notifikasi</h3>
                      <p>{notificationCount} notifikasi perlu diperhatikan</p>
                    </div>

                    <button
                      type="button"
                      className="notification-close"
                      onClick={() => setShowNotifications(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="notification-summary">
                    <div>
                      <strong>{lowStockSummary.outOfStock}</strong>
                      <span>Habis</span>
                    </div>
                    <div>
                      <strong>{lowStockSummary.lowStock}</strong>
                      <span>Stok Minimum</span>
                    </div>
                  </div>

                  <div className="notification-list">
                    {appNotifications.map((notification) => (
                      <button
                        type="button"
                        className={`notification-item app-notification-item ${
                          notification.isRead ? "is-read" : "is-unread"
                        }`}
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-status low-stock">✓</div>
                        <div className="notification-item-content">
                          <div className="notification-item-top">
                            <strong>{notification.title}</strong>
                            {!notification.isRead && (
                              <span className="notification-label low-stock">
                                Baru
                              </span>
                            )}
                          </div>
                          <p>{notification.message}</p>
                          <small>
                            {new Date(notification.createdAt).toLocaleString(
                              "id-ID",
                            )}
                          </small>
                        </div>
                      </button>
                    ))}

                    {alerts.map((alert) => (
                      <button
                        type="button"
                        className="notification-item"
                        key={alert.id}
                        onClick={() => {
                          setShowNotifications(false);
                          onNavigate("inventory-stock");
                        }}
                      >
                        <div
                          className={`notification-status ${
                            alert.severity === "OUT_OF_STOCK"
                              ? "out-of-stock"
                              : "low-stock"
                          }`}
                        >
                          !
                        </div>
                        <div className="notification-item-content">
                          <div className="notification-item-top">
                            <strong>{alert.itemName}</strong>
                            <span className="notification-label low-stock">
                              {alert.severity === "OUT_OF_STOCK"
                                ? "Habis"
                                : "Stok Minimum"}
                            </span>
                          </div>
                          <p>{alert.warehouseName}</p>
                          <small>{alert.message}</small>
                        </div>
                      </button>
                    ))}

                    {alerts.length === 0 && appNotifications.length === 0 && (
                      <div className="notification-empty">
                        <span>✓</span>
                        <strong>Tidak ada notifikasi</strong>
                        <p>Belum ada notifikasi yang perlu diperhatikan.</p>
                      </div>
                    )}
                  </div>

                  <div className="notification-footer">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate("inventory-stock");
                      }}
                    >
                      Lihat Inventory Stock →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-profile">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.role || "User"}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {activePage === "vendors" ? (
            <VendorManagement
              user={user}
              onLogout={onLogout}
              onNavigate={onNavigate}
            />
          ) : activePage === "requisitions" ? (
            <Requisitions onNavigate={onNavigate} />
          ) : activePage === "approvals" ? (
            <ApprovalManagement />
          ) : activePage === "purchase-orders" ? (
            <PurchaseOrders />
          ) : activePage === "goods-receipts" ? (
            <GoodsReceipt />
          ) : activePage === "invoices" ? (
            <Invoices />
          ) : activePage === "inventory-items" ? (
            <InventoryItems />
          ) : activePage === "inventory-stock" ? (
            <InventoryStock />
          ) : activePage === "stock-transactions" ? (
            <StockTransactions />
          ) : activePage === "user-management" ? (
            <UserManagement />
          ) : activePage === "reports" ? (
            <Reports />
          ) : activePage === "warehouses" ? (
            <WarehouseManagement />
          ) : activePage === "stock-opname" ? (
            <StockOpname />
          ) : (
            <>
              <section className="dashboard-welcome">
                <div>
                  <p className="eyebrow">PROCUREMENT MANAGEMENT SYSTEM</p>
                  <h1>Selamat datang, {user.name.split(" ")[0]}</h1>
                  <p>
                    Pantau aktivitas procurement, persediaan, dan transaksi
                    perusahaan dalam satu dashboard.
                  </p>
                </div>

                <button
                  className="primary-action"
                  onClick={() => onNavigate("requisitions")}
                >
                  ＋ Buat Requisition
                </button>
              </section>

              {dashboardError && (
                <div className="dashboard-error">{dashboardError}</div>
              )}

              <div className="dashboard-filter-row">
                <div>
                  <strong>Ringkasan Dashboard</strong>
                  <span>Data berdasarkan database ProcurePro</span>
                </div>

                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(Number(event.target.value))
                  }
                  aria-label="Pilih tahun dashboard"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map(
                    (year) => (
                      <option key={year} value={year}>
                        Tahun {year}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {dashboardLoading ? (
                <div className="dashboard-loading">
                  Memuat data dashboard dari database...
                </div>
              ) : (
                <>
                  <section className="stats-grid">
                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Total Procurement</span>
                        <div className="stat-icon">◈</div>
                      </div>
                      <h2>
                        {formatCurrency(data.statistics.totalProcurement)}
                      </h2>
                      <div className="stat-card-bottom">
                        <span>Nilai PO tahun {selectedYear}</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Active Vendors</span>
                        <div className="stat-icon">♙</div>
                      </div>
                      <h2>{formatNumber(data.statistics.activeVendors)}</h2>
                      <div className="stat-card-bottom">
                        <span>Vendor berstatus aktif</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Pending Approvals</span>
                        <div className="stat-icon">◷</div>
                      </div>
                      <h2>{formatNumber(data.statistics.pendingApprovals)}</h2>
                      <div className="stat-card-bottom">
                        <span>Menunggu persetujuan</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Purchase Orders</span>
                        <div className="stat-icon">▤</div>
                      </div>
                      <h2>
                        {formatNumber(data.statistics.totalPurchaseOrders)}
                      </h2>
                      <div className="stat-card-bottom">
                        <span>PO dibuat tahun {selectedYear}</span>
                      </div>
                    </article>
                  </section>

                  <section className="dashboard-middle-grid">
                    <article className="dashboard-panel spending-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Procurement Overview</h3>
                          <p>Nilai Purchase Order per bulan</p>
                        </div>
                      </div>

                      <div className="spending-total">
                        <strong>
                          {formatCurrency(data.statistics.totalProcurement)}
                        </strong>
                        <span>Total tahun {selectedYear}</span>
                      </div>

                      <div className="chart-area">
                        <div className="chart-bars">
                          {data.procurementChart.map((item) => (
                            <div className="chart-column" key={item.month}>
                              <div
                                className="chart-bar"
                                style={{
                                  height: `${
                                    item.amount === 0
                                      ? 0
                                      : Math.max(
                                          4,
                                          (item.amount / maxChartValue) * 100,
                                        )
                                  }%`,
                                }}
                                title={formatCurrency(item.amount)}
                              />
                              <span>{monthNames[item.month - 1]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>

                    <article className="dashboard-panel status-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Requisition Status</h3>
                          <p>Status seluruh permintaan tahun {selectedYear}</p>
                        </div>
                      </div>

                      <div className="status-total">
                        <strong>{formatNumber(data.requisitions.total)}</strong>
                        <span>Total Requisitions</span>
                      </div>

                      <div className="status-legend">
                        {statusItems.map((item) => (
                          <div key={item.label}>
                            <i className={`legend-dot ${item.className}-dot`} />
                            <span>{item.label}</span>
                            <strong>{formatNumber(item.value)}</strong>
                          </div>
                        ))}
                      </div>

                      <button
                        className="text-action"
                        onClick={() => onNavigate("requisitions")}
                      >
                        Lihat semua requisition →
                      </button>
                    </article>
                  </section>

                  <section className="stats-grid dashboard-secondary-stats">
                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Total Inventory Items</span>
                        <div className="stat-icon">▤</div>
                      </div>
                      <h2>{formatNumber(data.inventory.totalItems)}</h2>
                      <div className="stat-card-bottom">
                        <span>Barang aktif</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Total Stock</span>
                        <div className="stat-icon">▧</div>
                      </div>
                      <h2>{formatNumber(data.inventory.totalStock)}</h2>
                      <div className="stat-card-bottom">
                        <span>Akumulasi stok seluruh gudang</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Low Stock Items</span>
                        <div className="stat-icon">!</div>
                      </div>
                      <h2>{formatNumber(data.inventory.lowStockItems)}</h2>
                      <div className="stat-card-bottom">
                        <span>Barang mencapai stok minimum</span>
                      </div>
                    </article>

                    <article className="stat-card">
                      <div className="stat-card-top">
                        <span>Total Warehouses</span>
                        <div className="stat-icon">▦</div>
                      </div>
                      <h2>{formatNumber(data.inventory.totalWarehouses)}</h2>
                      <div className="stat-card-bottom">
                        <span>Gudang aktif</span>
                      </div>
                    </article>
                  </section>

                  <section className="dashboard-middle-grid">
                    <article className="dashboard-panel status-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Invoice Overview</h3>
                          <p>Status invoice tahun {selectedYear}</p>
                        </div>
                      </div>

                      <div className="status-total">
                        <strong>{formatNumber(data.invoices.total)}</strong>
                        <span>Total Invoices</span>
                      </div>

                      <div className="status-legend">
                        <div>
                          <i className="legend-dot draft-dot" />
                          <span>Draft</span>
                          <strong>{data.invoices.draft}</strong>
                        </div>
                        <div>
                          <i className="legend-dot pending-dot" />
                          <span>Pending</span>
                          <strong>{data.invoices.pending}</strong>
                        </div>
                        <div>
                          <i className="legend-dot approved-dot" />
                          <span>Verified</span>
                          <strong>{data.invoices.verified}</strong>
                        </div>
                        <div>
                          <i className="legend-dot rejected-dot" />
                          <span>Rejected</span>
                          <strong>{data.invoices.rejected}</strong>
                        </div>
                        <div>
                          <i className="legend-dot completed-dot" />
                          <span>Paid</span>
                          <strong>{data.invoices.paid}</strong>
                        </div>
                      </div>

                      <button
                        className="text-action"
                        onClick={() => onNavigate("invoices")}
                      >
                        Lihat semua invoice →
                      </button>
                    </article>

                    <article className="dashboard-panel status-panel invoice-total-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Unpaid Invoices</h3>
                          <p>Tagihan yang belum dibayar</p>
                        </div>
                      </div>
                      <div className="status-total">
                        <strong>
                          {formatCurrency(data.invoices.unpaidAmount)}
                        </strong>
                        <span>{data.invoices.unpaid} invoice belum lunas</span>
                      </div>
                      <button
                        className="text-action"
                        onClick={() => onNavigate("invoices")}
                      >
                        Periksa invoice →
                      </button>
                    </article>
                  </section>

                  <section className="dashboard-bottom-grid">
                    <article className="dashboard-panel orders-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Recent Purchase Orders</h3>
                          <p>Lima Purchase Order terbaru dari database</p>
                        </div>
                        <button
                          className="text-action"
                          onClick={() => onNavigate("purchase-orders")}
                        >
                          Lihat semua →
                        </button>
                      </div>

                      <div className="table-scroll">
                        <table className="orders-table">
                          <thead>
                            <tr>
                              <th>PO NUMBER</th>
                              <th>VENDOR</th>
                              <th>DATE</th>
                              <th>AMOUNT</th>
                              <th>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.length > 0 ? (
                              filteredOrders.map((order) => (
                                <tr key={order.id}>
                                  <td className="order-id">{order.poNumber}</td>
                                  <td>{order.vendor}</td>
                                  <td>{formatDate(order.date)}</td>
                                  <td className="order-amount">
                                    {formatCurrency(order.amount)}
                                  </td>
                                  <td>
                                    <span
                                      className={`order-status ${getStatusClass(order.status)}`}
                                    >
                                      <i />
                                      {order.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5}>
                                  Tidak ada Purchase Order yang ditemukan.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="dashboard-panel activity-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Recent Activity</h3>
                          <p>Aktivitas terbaru dari database</p>
                        </div>
                      </div>

                      <div className="activity-list">
                        {data.recentActivities.length > 0 ? (
                          data.recentActivities.map((activity) => (
                            <div className="activity-item" key={activity.id}>
                              <div className="activity-icon">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="activity-detail">
                                <strong>{activity.title}</strong>
                                <span>{activity.detail}</span>
                                {activity.actor && (
                                  <span>Oleh: {activity.actor}</span>
                                )}
                                <small>
                                  {formatRelativeTime(activity.createdAt)}
                                </small>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p>Belum ada aktivitas.</p>
                        )}
                      </div>
                    </article>
                  </section>
                </>
              )}

              <footer className="dashboard-footer">
                <span>© {currentYear} ProcurePro. All rights reserved.</span>
                <span>Procurement Management System · v1.0.0</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

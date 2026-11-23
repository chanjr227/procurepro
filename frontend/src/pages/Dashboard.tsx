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

const stats = [
  {
    label: "Total Procurement",
    value: "Rp 2,45 M",
    change: "+12.8%",
    icon: "◈",
  },
  {
    label: "Active Vendors",
    value: "128",
    change: "+8.2%",
    icon: "♙",
  },
  {
    label: "Pending Approvals",
    value: "24",
    change: "Perlu tindakan",
    icon: "◷",
  },
  {
    label: "Purchase Orders",
    value: "86",
    change: "+5.4%",
    icon: "▤",
  },
];

const orders = [
  {
    id: "PO-2026-0086",
    vendor: "PT Sinar Teknologi",
    date: "09 Nov 2026",
    amount: "Rp 45.500.000",
    status: "Approved",
  },
  {
    id: "PO-2026-0085",
    vendor: "CV Mitra Supplies",
    date: "08 Nov 2026",
    amount: "Rp 18.750.000",
    status: "Pending",
  },
  {
    id: "PO-2026-0084",
    vendor: "PT Global Industri",
    date: "07 Nov 2026",
    amount: "Rp 72.000.000",
    status: "Processing",
  },
  {
    id: "PO-2026-0083",
    vendor: "PT Digital Nusantara",
    date: "06 Nov 2026",
    amount: "Rp 12.300.000",
    status: "Approved",
  },
  {
    id: "PO-2026-0082",
    vendor: "CV Berkah Jaya",
    date: "05 Nov 2026",
    amount: "Rp 8.900.000",
    status: "Rejected",
  },
];

const activities = [
  {
    title: "Purchase Order approved",
    detail: "PO-2026-0086 · PT Sinar Teknologi",
    time: "10 menit lalu",
    icon: "✓",
  },
  {
    title: "New vendor registered",
    detail: "PT Karya Digital Indonesia",
    time: "35 menit lalu",
    icon: "+",
  },
  {
    title: "Purchase request submitted",
    detail: "PR-2026-0124 · Divisi IT",
    time: "1 jam lalu",
    icon: "↗",
  },
  {
    title: "Invoice received",
    detail: "INV-2026-044 · CV Mitra Supplies",
    time: "3 jam lalu",
    icon: "▤",
  },
];

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
      { label: "Approvals", icon: "✓", count: "24" },
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
  inventoryItemId: number;
  warehouseId: number;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  warehouseCode: string;
  warehouseName: string;
  severity: "OUT_OF_STOCK" | "LOW_STOCK";
  message: string;
  updatedAt: string;
}

interface LowStockSummary {
  totalAlerts: number;
  outOfStock: number;
  lowStock: number;
}

interface AppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
}

// Menampilkan dashboard dan mengatur navigasi serta notifikasi pengguna.
export default function Dashboard({
  user,
  onLogout,
  onNavigate,
  activePage,
}: DashboardProps) {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");

  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);

  const [notificationSummary, setNotificationSummary] =
    useState<LowStockSummary>({
      totalAlerts: 0,
      outOfStock: 0,
      lowStock: 0,
    });

  const [showNotifications, setShowNotifications] = useState(false);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // Mengambil notifikasi stok saat halaman dibuka dan menjadwalkan pembaruan.
  // Mengambil notifikasi stok dan notifikasi sistem.
  useEffect(() => {
    const fetchLowStockAlerts = async () => {
      try {
        const response = await api.get("/low-stock-alerts");
        const result = response.data.data;

        setAlerts(result.alerts || []);

        setNotificationSummary(
          result.summary || {
            totalAlerts: 0,
            outOfStock: 0,
            lowStock: 0,
          },
        );
      } catch (error) {
        console.error("Gagal mengambil notifikasi stok:", error);
      }
    };

    const fetchAppNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        const result = response.data.data;

        setAppNotifications(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      } catch (error) {
        console.error("Gagal mengambil notifikasi sistem:", error);
      }
    };

    const fetchAllNotifications = () => {
      fetchLowStockAlerts();
      fetchAppNotifications();
    };

    fetchAllNotifications();

    const interval = setInterval(fetchAllNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  // Menyamakan menu aktif dengan halaman yang sedang dibuka.
  // Menyamakan menu aktif dengan halaman yang sedang dibuka.
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
  // Membuka halaman sesuai menu yang dipilih pengguna.
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

    const page = pageMap[label];

    if (page) {
      setActiveMenu(label);
      onNavigate(page);
    }
  };

  // Menandai notifikasi sebagai sudah dibaca dan membuka halaman terkait.
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
          {menuGroups.map(
            // Menampilkan setiap kelompok menu pada sidebar.
            (group) => (
              <div className="menu-group" key={group.title}>
                <p className="menu-heading">{group.title}</p>

                {group.items.map(
                  // Menampilkan item menu beserta status aktifnya.
                  (item) => (
                    <button
                      key={item.label}
                      className={`sidebar-link ${
                        activeMenu === item.label ? "active" : ""
                      }`}
                      onClick={
                        // Menangani pemilihan item menu.
                        () => handleMenuClick(item.label)
                      }
                    >
                      <span className="sidebar-icon">{item.icon}</span>
                      <span>{item.label}</span>

                      {item.count && (
                        <span className="menu-count">{item.count}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            ),
          )}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`sidebar-link ${
              activeMenu === "Settings" ? "active" : ""
            }`}
            onClick={
              // Mengaktifkan menu pengaturan.
              () => setActiveMenu("Settings")
            }
          >
            <span className="sidebar-icon">⚙</span>
            Settings
          </button>

          <div className="sidebar-user">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span>{user.role || "Administrator"}</span>
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
                placeholder="Search anything..."
                value={search}
                onChange={
                  // Memperbarui kata kunci pencarian pesanan.
                  (e) => setSearch(e.target.value)
                }
              />
              <kbd>⌘ K</kbd>
            </label>

            <div className="notification-wrapper">
              <button
                className="notification-button"
                title="Notifications"
                type="button"
                onClick={
                  // Membuka atau menutup panel notifikasi.
                  () => setShowNotifications(!showNotifications)
                }
                aria-expanded={showNotifications}
              >
                <span className="notification-bell">♧</span>

                {notificationSummary.totalAlerts + unreadCount > 0 && (
                  <span className="notification-badge">
                    {notificationSummary.totalAlerts + unreadCount > 99
                      ? "99+"
                      : notificationSummary.totalAlerts + unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <div>
                      <h3>Notifikasi Stok</h3>
                      <h3>Notifikasi</h3>
                      <p>
                        {notificationSummary.totalAlerts + unreadCount}{" "}
                        notifikasi perlu diperhatikan
                      </p>
                    </div>

                    <button
                      type="button"
                      className="notification-close"
                      onClick={
                        // Menutup panel notifikasi.
                        () => setShowNotifications(false)
                      }
                    >
                      ×
                    </button>
                  </div>

                  <div className="notification-summary">
                    <div>
                      <strong>{notificationSummary.outOfStock}</strong>
                      <span>Habis</span>
                    </div>

                    <div>
                      <strong>{notificationSummary.lowStock}</strong>
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
                        key={`app-${notification.id}`}
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
                    {alerts.length === 0 && appNotifications.length === 0 ? (
                      <div className="notification-empty">
                        <span>✓</span>
                        <strong>Tidak ada peringatan stok</strong>
                        <p>Semua stok masih dalam kondisi aman.</p>
                      </div>
                    ) : (
                      alerts.map(
                        // Menampilkan detail untuk setiap peringatan stok.
                        (alert) => (
                          <button
                            type="button"
                            className="notification-item"
                            key={alert.id}
                            onClick={
                              // Membuka halaman stok setelah notifikasi dipilih.
                              () => {
                                setShowNotifications(false);
                                onNavigate("inventory-stock");
                              }
                            }
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

                                <span
                                  className={`notification-label ${
                                    alert.severity === "OUT_OF_STOCK"
                                      ? "out-of-stock"
                                      : "low-stock"
                                  }`}
                                >
                                  {alert.severity === "OUT_OF_STOCK"
                                    ? "Habis"
                                    : "Stok Minimum"}
                                </span>
                              </div>

                              <p>{alert.warehouseName}</p>

                              <div className="notification-stock-info">
                                <span>
                                  Stok:{" "}
                                  <strong>
                                    {alert.currentStock} {alert.unit}
                                  </strong>
                                </span>

                                <span>
                                  Minimum:{" "}
                                  <strong>
                                    {alert.minimumStock} {alert.unit}
                                  </strong>
                                </span>
                              </div>

                              <small>{alert.message}</small>
                            </div>
                          </button>
                        ),
                      )
                    )}
                  </div>

                  <div className="notification-footer">
                    <button
                      type="button"
                      onClick={
                        // Membuka halaman stok dari tautan pada panel notifikasi.
                        () => {
                          setShowNotifications(false);
                          onNavigate("inventory-stock");
                        }
                      }
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
              <span>⌄</span>
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
                  <p className="eyebrow">SATURDAY, 14 NOVEMBER 2026</p>
                  <h1>Good afternoon, {user.name.split(" ")[0]}</h1>
                  <p>
                    Berikut ringkasan aktivitas procurement perusahaan hari ini.
                  </p>
                </div>

                <button
                  className="primary-action"
                  onClick={
                    // Membuka halaman pembuatan requisition.
                    () => onNavigate("requisitions")
                  }
                >
                  <span>＋</span> Create Requisition
                </button>
              </section>

              <section className="stats-grid">
                {stats.map(
                  // Menampilkan setiap kartu statistik dashboard.
                  (stat) => (
                    <article className="stat-card" key={stat.label}>
                      <div className="stat-card-top">
                        <span>{stat.label}</span>
                        <div className="stat-icon">{stat.icon}</div>
                      </div>

                      <h2>{stat.value}</h2>

                      <div className="stat-card-bottom">
                        <span className="stat-change">{stat.change}</span>
                        <span>vs last month</span>
                      </div>
                    </article>
                  ),
                )}
              </section>

              <section className="dashboard-middle-grid">
                <article className="dashboard-panel spending-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Procurement Overview</h3>
                      <p>Monthly procurement spending</p>
                    </div>

                    <select aria-label="Select period" defaultValue="2026">
                      <option value="2026">Year 2026</option>
                      <option value="2025">Year 2025</option>
                    </select>
                  </div>

                  <div className="spending-total">
                    <strong>Rp 2.45 M</strong>
                    <span>
                      ↑ 12.8% <small>vs last year</small>
                    </span>
                  </div>

                  <div className="chart-area">
                    <div className="chart-y-labels">
                      <span>800 jt</span>
                      <span>600 jt</span>
                      <span>400 jt</span>
                      <span>200 jt</span>
                      <span>0</span>
                    </div>

                    <div className="chart-bars">
                      {[38, 52, 44, 68, 56, 78, 62, 88, 70, 95, 76, 84].map(
                        // Menggambar kolom grafik untuk setiap bulan.
                        (height, index) => (
                          <div className="chart-column" key={index}>
                            <div
                              className={`chart-bar ${
                                index === 9 ? "highlight" : ""
                              }`}
                              style={{ height: `${height}%` }}
                              title={`${height}%`}
                            />

                            <span>
                              {
                                [
                                  "Jan",
                                  "Feb",
                                  "Mar",
                                  "Apr",
                                  "May",
                                  "Jun",
                                  "Jul",
                                  "Aug",
                                  "Sep",
                                  "Oct",
                                  "Nov",
                                  "Dec",
                                ][index]
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </article>

                <article className="dashboard-panel status-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Requisition Status</h3>
                      <p>Current request overview</p>
                    </div>
                    <button className="more-button" type="button">
                      ···
                    </button>
                  </div>

                  <div className="status-total">
                    <strong>156</strong>
                    <span>Total Requests</span>
                  </div>

                  <div className="status-progress">
                    <div className="progress-track">
                      <span className="progress-approved" />
                      <span className="progress-pending" />
                      <span className="progress-rejected" />
                    </div>
                  </div>

                  <div className="status-legend">
                    <div>
                      <i className="legend-dot approved-dot" />
                      <span>Approved</span>
                      <strong>98</strong>
                    </div>
                    <div>
                      <i className="legend-dot pending-dot" />
                      <span>Pending</span>
                      <strong>42</strong>
                    </div>
                    <div>
                      <i className="legend-dot rejected-dot" />
                      <span>Rejected</span>
                      <strong>16</strong>
                    </div>
                  </div>

                  <button
                    className="text-action"
                    onClick={
                      // Membuka daftar requisition.
                      () => onNavigate("requisitions")
                    }
                  >
                    View all requisitions →
                  </button>
                </article>
              </section>

              <section className="dashboard-bottom-grid">
                <article className="dashboard-panel orders-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Purchase Orders</h3>
                      <p>Monitor your latest procurement transactions</p>
                    </div>

                    <button
                      className="text-action"
                      onClick={
                        // Membuka daftar purchase order.
                        () => onNavigate("purchase-orders")
                      }
                    >
                      View all →
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
                        {orders
                          .filter(
                            // Memilih pesanan yang cocok dengan kata kunci pencarian.
                            (order) =>
                              `${order.id} ${order.vendor} ${order.status}`
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                          )
                          .map(
                            // Menampilkan baris untuk setiap pesanan yang cocok.
                            (order) => (
                              <tr key={order.id}>
                                <td className="order-id">{order.id}</td>
                                <td>{order.vendor}</td>
                                <td>{order.date}</td>
                                <td className="order-amount">{order.amount}</td>
                                <td>
                                  <span
                                    className={`order-status ${order.status.toLowerCase()}`}
                                  >
                                    <i />
                                    {order.status}
                                  </span>
                                </td>
                              </tr>
                            ),
                          )}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="dashboard-panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Activity</h3>
                      <p>Latest updates across workspace</p>
                    </div>
                    <button className="more-button" type="button">
                      ···
                    </button>
                  </div>

                  <div className="activity-list">
                    {activities.map(
                      // Menampilkan setiap aktivitas terbaru.
                      (activity, index) => (
                        <div className="activity-item" key={index}>
                          <div className="activity-icon">{activity.icon}</div>
                          <div className="activity-detail">
                            <strong>{activity.title}</strong>
                            <span>{activity.detail}</span>
                            <small>{activity.time}</small>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </article>
              </section>

              <footer className="dashboard-footer">
                <span>© 2026 ProcurePro. All rights reserved.</span>
                <span>
                  Procurement Management System <i /> v1.0.0
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

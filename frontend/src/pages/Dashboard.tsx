import { useEffect, useState } from "react";

import "../css/dashboard.css";
import VendorManagement from "./VendorManagement";
import Requisitions from "./Requisitions";
import ApprovalManagement from "./ApprovalManagement";

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

export default function Dashboard({
  user,
  onLogout,
  onNavigate,
  activePage,
}: DashboardProps) {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (activePage === "vendors") {
      setActiveMenu("Vendors");
    } else if (activePage === "requisitions") {
      setActiveMenu("Requisitions");
    } else if (activePage === "approvals") {
      setActiveMenu("Approvals");
    } else {
      setActiveMenu("Dashboard");
    }
  }, [activePage]);

  const handleMenuClick = (label: string) => {
    setActiveMenu(label);

    if (label === "Vendors") {
      onNavigate("vendors");
      return;
    }

    if (label === "Requisitions") {
      onNavigate("requisitions");
      return;
    }

    if (label === "Approvals") {
      onNavigate("approvals");
      return;
    }

    if (label === "Dashboard") {
      onNavigate("dashboard");
      return;
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

                  {item.count && (
                    <span className="menu-count">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`sidebar-link ${
              activeMenu === "Settings" ? "active" : ""
            }`}
            onClick={() => setActiveMenu("Settings")}
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
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>

            <button
              className="notification-button"
              title="Notifications"
              type="button"
            >
              ♧<i />
            </button>

            <div className="topbar-profile">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user.name}</strong>
                <span>Administrator</span>
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
          ) : (
            <>
              <section className="dashboard-welcome">
                <div>
                  <p className="eyebrow">TUESDAY, 10 NOVEMBER 2026</p>
                  <h1>Good afternoon, {user.name.split(" ")[0]}</h1>
                  <p>
                    Berikut ringkasan aktivitas procurement perusahaan hari ini.
                  </p>
                </div>

                <button
                  className="primary-action"
                  onClick={() => onNavigate("requisitions")}
                >
                  <span>＋</span> Create Requisition
                </button>
              </section>

              <section className="stats-grid">
                {stats.map((stat) => (
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
                ))}
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
                    onClick={() => onNavigate("requisitions")}
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
                      onClick={() => setActiveMenu("Purchase Orders")}
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
                          .filter((order) =>
                            `${order.id} ${order.vendor} ${order.status}`
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                          )
                          .map((order) => (
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
                          ))}
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
                    {activities.map((activity, index) => (
                      <div className="activity-item" key={index}>
                        <div className="activity-icon">{activity.icon}</div>
                        <div className="activity-detail">
                          <strong>{activity.title}</strong>
                          <span>{activity.detail}</span>
                          <small>{activity.time}</small>
                        </div>
                      </div>
                    ))}
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

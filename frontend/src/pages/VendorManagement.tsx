import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";

import api from "../services/api";
import "../css/dashboard.css";
import "../css/vendor.css";

type VendorStatus = "PENDING" | "ACTIVE" | "INACTIVE";

interface Vendor {
  id: number;
  vendorCode: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  status: VendorStatus;
  createdAt: string;
}

interface VendorForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  taxNumber: string;
  address: string;
  city: string;
  country: string;
  website: string;
  status: VendorStatus;
}

interface VendorManagementProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onBack: () => void;
}

interface ApiError {
  message?: string;
}

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

const emptyForm: VendorForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  taxNumber: "",
  address: "",
  city: "",
  country: "Indonesia",
  website: "",
  status: "PENDING",
};

export default function VendorManagement({
  user,
  onLogout,
  onNavigate,
  onBack,
}: VendorManagementProps) {
  const [activeMenu, setActiveMenu] = useState("Vendors");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [topbarSearch, setTopbarSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleMenuClick = (label: string) => {
    setActiveMenu(label);

    if (label === "Vendors") {
      onNavigate("vendors");
      return;
    }

    if (label === "Dashboard") {
      onNavigate("dashboard");
    }
  };

  // Mengambil data vendor dari backend
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const response = await api.get("/vendors", { params });

      setVendors(response.data.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiError>(err)) {
        setError(err.response?.data?.message || "Gagal mengambil data vendor.");
      } else {
        setError("Terjadi kesalahan saat mengambil data vendor.");
      }

      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Memuat data ketika halaman dibuka atau filter berubah
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchVendors();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [fetchVendors]);

  // Membuka form tambah vendor
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  // Membuka form edit vendor
  const openEditModal = (vendor: Vendor) => {
    setEditingId(vendor.id);

    setForm({
      companyName: vendor.companyName || "",
      contactName: vendor.contactName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      taxNumber: vendor.taxNumber || "",
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || "",
      website: vendor.website || "",
      status: vendor.status,
    });

    setFormError("");
    setModalOpen(true);
  };

  // Menutup modal
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  // Mengubah input form
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Menyimpan vendor baru atau memperbarui vendor
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!form.companyName.trim()) {
      setFormError("Nama perusahaan wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        taxNumber: form.taxNumber.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        website: form.website.trim() || null,
      };

      if (editingId !== null) {
        await api.put(`/vendors/${editingId}`, payload);
      } else {
        await api.post("/vendors", payload);
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await fetchVendors();
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiError>(err)) {
        setFormError(
          err.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan vendor.",
        );
      } else {
        setFormError("Terjadi kesalahan saat menyimpan vendor.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Menghapus vendor
  const handleDelete = async (vendor: Vendor) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus vendor "${vendor.companyName}"?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/vendors/${vendor.id}`);
      await fetchVendors();
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiError>(err)) {
        window.alert(err.response?.data?.message || "Gagal menghapus vendor.");
      } else {
        window.alert("Terjadi kesalahan saat menghapus vendor.");
      }
    }
  };

  // Format tanggal
  const formatDate = (date: string) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Label status
  const statusLabel = (status: VendorStatus) => {
    const labels: Record<VendorStatus, string> = {
      PENDING: "Pending",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    };

    return labels[status];
  };

  // Statistik vendor
  const totalActive = vendors.filter(
    (vendor) => vendor.status === "ACTIVE",
  ).length;

  const totalPending = vendors.filter(
    (vendor) => vendor.status === "PENDING",
  ).length;

  const totalInactive = vendors.filter(
    (vendor) => vendor.status === "INACTIVE",
  ).length;

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
            <strong>Vendors</strong>
          </div>

          <div className="topbar-actions">
            <label className="dashboard-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search anything..."
                value={topbarSearch}
                onChange={(e) => setTopbarSearch(e.target.value)}
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

        <div className="vendor-page">
          {/* HEADER */}
          <header className="vendor-header">
            <div>
              <button
                type="button"
                className="vendor-back-button"
                onClick={onBack}
              >
                ← Dashboard
              </button>

              <div className="vendor-breadcrumb">
                Procurement <span>/</span> Vendor Management
              </div>

              <h1>Vendor Management</h1>

              <p>
                Kelola informasi dan hubungan dengan seluruh vendor perusahaan.
              </p>
            </div>

            <button
              type="button"
              className="vendor-add-button"
              onClick={openAddModal}
            >
              <span>＋</span> Add New Vendor
            </button>
          </header>

          {/* STATISTICS */}
          <section className="vendor-stats">
        <div className="vendor-stat-card">
          <div className="vendor-stat-icon purple">▤</div>
          <div>
            <span>Total Vendors</span>
            <strong>{loading ? "—" : vendors.length}</strong>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon green">✓</div>
          <div>
            <span>Active Vendors</span>
            <strong>{loading ? "—" : totalActive}</strong>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon orange">◷</div>
          <div>
            <span>Pending Vendors</span>
            <strong>{loading ? "—" : totalPending}</strong>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon gray">−</div>
          <div>
            <span>Inactive Vendors</span>
            <strong>{loading ? "—" : totalInactive}</strong>
          </div>
        </div>
          </section>

      {/* VENDOR TABLE */}
      <section className="vendor-table-card">
        <div className="vendor-table-heading">
          <div>
            <h2>All Vendors</h2>
            <p>Daftar perusahaan yang terdaftar dalam sistem.</p>
          </div>
        </div>

        <div className="vendor-toolbar">
          <div className="vendor-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search vendor name, code, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="vendor-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {error && (
          <div className="vendor-error">
            {error}

            <button type="button" onClick={fetchVendors}>
              Try Again
            </button>
          </div>
        )}

        <div className="vendor-table-wrapper">
          <table className="vendor-table">
            <thead>
              <tr>
                <th>VENDOR</th>
                <th>CONTACT PERSON</th>
                <th>CONTACT INFO</th>
                <th>LOCATION</th>
                <th>STATUS</th>
                <th>DATE ADDED</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="vendor-empty">
                    Loading vendor data...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="vendor-empty">
                    <strong>No vendors found</strong>
                    <span>Belum ada data vendor yang sesuai.</span>
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div className="vendor-company">
                        <div className="vendor-avatar">
                          {vendor.companyName.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{vendor.companyName}</strong>
                          <span>{vendor.vendorCode}</span>
                        </div>
                      </div>
                    </td>

                    <td>{vendor.contactName || "—"}</td>

                    <td>
                      <div className="vendor-contact">
                        <span>{vendor.email || "—"}</span>
                        <span>{vendor.phone || "—"}</span>
                      </div>
                    </td>

                    <td>
                      {vendor.city || "—"}
                      {vendor.country ? `, ${vendor.country}` : ""}
                    </td>

                    <td>
                      <span
                        className={`vendor-status ${vendor.status.toLowerCase()}`}
                      >
                        {statusLabel(vendor.status)}
                      </span>
                    </td>

                    <td>{formatDate(vendor.createdAt)}</td>

                    <td>
                      <div className="vendor-actions">
                        <button
                          type="button"
                          title="Edit vendor"
                          onClick={() => openEditModal(vendor)}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="delete"
                          title="Delete vendor"
                          onClick={() => handleDelete(vendor)}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="vendor-table-footer">
          Menampilkan {vendors.length} vendor
        </div>
          </section>

      {/* ADD / EDIT MODAL */}
          {modalOpen && (
        <div
          className="vendor-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="vendor-modal">
            <div className="vendor-modal-header">
              <div>
                <h2>{editingId !== null ? "Edit Vendor" : "Add New Vendor"}</h2>

                <p>
                  {editingId !== null
                    ? "Perbarui informasi perusahaan vendor."
                    : "Masukkan informasi perusahaan vendor baru."}
                </p>
              </div>

              <button type="button" onClick={closeModal} disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="vendor-form-grid">
                <div className="vendor-form-group full">
                  <label>Company Name *</label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="vendor-form-group">
                  <label>Contact Person</label>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="Contact person name"
                  />
                </div>

                <div className="vendor-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="vendor@company.com"
                  />
                </div>

                <div className="vendor-form-group">
                  <label>Phone Number</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+62..."
                  />
                </div>

                <div className="vendor-form-group">
                  <label>Tax Number</label>
                  <input
                    name="taxNumber"
                    value={form.taxNumber}
                    onChange={handleChange}
                    placeholder="Tax identification number"
                  />
                </div>

                <div className="vendor-form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>

                <div className="vendor-form-group">
                  <label>Country</label>
                  <input
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </div>

                <div className="vendor-form-group full">
                  <label>Website</label>
                  <input
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://company.com"
                  />
                </div>

                <div className="vendor-form-group full">
                  <label>Company Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter complete company address"
                    rows={3}
                  />
                </div>

                <div className="vendor-form-group full">
                  <label>Vendor Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="vendor-form-error">{formError}</div>
              )}

              <div className="vendor-modal-footer">
                <button
                  type="button"
                  className="vendor-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vendor-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import "../css/purchase-orders.css";

interface PurchaseOrder {
  id: string;
  vendor: string;
  requisition: string;
  date: string;
  amount: number;
  status: "DRAFT" | "SENT" | "COMPLETED" | "CANCELLED";
}

const initialOrders: PurchaseOrder[] = [
  {
    id: "PO-2026-0001",
    vendor: "PT Sinar Teknologi",
    requisition: "REQ-2026-0001",
    date: "14 Nov 2026",
    amount: 45500000,
    status: "SENT",
  },
  {
    id: "PO-2026-0002",
    vendor: "CV Mitra Supplies",
    requisition: "REQ-2026-0002",
    date: "13 Nov 2026",
    amount: 18750000,
    status: "DRAFT",
  },
  {
    id: "PO-2026-0003",
    vendor: "PT Global Industri",
    requisition: "REQ-2026-0003",
    date: "12 Nov 2026",
    amount: 72000000,
    status: "COMPLETED",
  },
];

interface PurchaseOrdersProps {
  onNavigate?: (page: string) => void;
}

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    vendor: "",
    requisition: "",
    amount: "",
  });

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  const filteredOrders = orders.filter((order) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      order.id.toLowerCase().includes(keyword) ||
      order.vendor.toLowerCase().includes(keyword) ||
      order.requisition.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.vendor || !form.requisition || !form.amount) {
      alert("Lengkapi semua data Purchase Order.");
      return;
    }

    const nextNumber = orders.length + 1;

    const newOrder: PurchaseOrder = {
      id: `PO-2026-${String(nextNumber).padStart(4, "0")}`,
      vendor: form.vendor,
      requisition: form.requisition,
      date: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount: Number(form.amount),
      status: "DRAFT",
    };

    setOrders((previous) => [newOrder, ...previous]);

    setForm({
      vendor: "",
      requisition: "",
      amount: "",
    });

    setShowForm(false);
  };

  const updateStatus = (id: string, status: PurchaseOrder["status"]) => {
    setOrders((previous) =>
      previous.map((order) => (order.id === id ? { ...order, status } : order)),
    );
  };

  return (
    <div className="po-page">
      <div className="po-header">
        <div>
          <span className="po-eyebrow">PROCUREMENT MANAGEMENT</span>
          <h1>Purchase Orders</h1>
          <p>
            Kelola pesanan pembelian dan transaksi dengan vendor perusahaan.
          </p>
        </div>

        <button
          className="po-primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          + Create Purchase Order
        </button>
      </div>

      <div className="po-stats">
        <div className="po-stat-card">
          <span>Total Purchase Orders</span>
          <strong>{orders.length}</strong>
          <small>Seluruh pesanan</small>
        </div>

        <div className="po-stat-card">
          <span>Draft Orders</span>
          <strong>
            {orders.filter((order) => order.status === "DRAFT").length}
          </strong>
          <small>Belum dikirim</small>
        </div>

        <div className="po-stat-card">
          <span>Sent Orders</span>
          <strong>
            {orders.filter((order) => order.status === "SENT").length}
          </strong>
          <small>Sudah dikirim ke vendor</small>
        </div>

        <div className="po-stat-card">
          <span>Completed Orders</span>
          <strong>
            {orders.filter((order) => order.status === "COMPLETED").length}
          </strong>
          <small>Pesanan selesai</small>
        </div>
      </div>

      {showForm && (
        <div className="po-form-card">
          <div className="po-section-heading">
            <div>
              <h2>Create Purchase Order</h2>
              <p>Masukkan informasi pesanan pembelian.</p>
            </div>
            <button
              className="po-close-button"
              onClick={() => setShowForm(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className="po-form-grid">
              <label>
                Vendor
                <input
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="Masukkan nama vendor"
                  required
                />
              </label>

              <label>
                Requisition Number
                <input
                  value={form.requisition}
                  onChange={(e) =>
                    setForm({ ...form, requisition: e.target.value })
                  }
                  placeholder="Contoh: REQ-2026-0001"
                  required
                />
              </label>

              <label>
                Total Amount (Rp)
                <input
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Contoh: 25000000"
                  required
                />
              </label>
            </div>

            <div className="po-form-actions">
              <button
                type="button"
                className="po-secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="po-primary-button">
                Save Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="po-table-card">
        <div className="po-section-heading">
          <div>
            <h2>Purchase Order List</h2>
            <p>Daftar seluruh pesanan pembelian perusahaan.</p>
          </div>
        </div>

        <div className="po-toolbar">
          <input
            type="search"
            placeholder="Search PO, vendor, or requisition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="po-table-wrapper">
          <table className="po-table">
            <thead>
              <tr>
                <th>PO NUMBER</th>
                <th>VENDOR</th>
                <th>REQUISITION</th>
                <th>ORDER DATE</th>
                <th>TOTAL AMOUNT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="po-number">{order.id}</td>
                    <td>{order.vendor}</td>
                    <td>{order.requisition}</td>
                    <td>{order.date}</td>
                    <td className="po-amount">{formatRupiah(order.amount)}</td>
                    <td>
                      <span
                        className={`po-status ${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="po-action-select"
                        value={order.status}
                        aria-label={`Update status ${order.id}`}
                        onChange={(e) =>
                          updateStatus(
                            order.id,
                            e.target.value as PurchaseOrder["status"],
                          )
                        }
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="po-empty">
                    Tidak ada Purchase Order ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="po-table-footer">
          Menampilkan {filteredOrders.length} dari {orders.length} Purchase
          Orders
        </div>
      </div>
    </div>
  );
}

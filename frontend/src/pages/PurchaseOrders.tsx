import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

import api from "../services/api";
import "../css/purchase-orders.css";

type POStatus = "DRAFT" | "SENT" | "COMPLETED" | "CANCELLED";

interface Vendor {
  id: number;
  vendorCode: string;
  companyName: string;
  email?: string | null;
}

interface RequisitionItem {
  id: number;
  itemName: string;
  description?: string | null;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number | string;
}

interface Requisition {
  id: number;
  requestNumber: string;
  title: string;
  department: string;
  neededDate?: string | null;
  items: RequisitionItem[];
}

interface POItem {
  id?: number;
  itemName: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | string;
  totalPrice: number | string;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorId: number;
  requisitionId: number;
  vendor: Vendor;
  requisition: Requisition;
  orderDate: string;
  deliveryDate?: string | null;
  subtotal: number | string;
  tax: number | string;
  totalAmount: number | string;
  notes?: string | null;
  status: POStatus;
  items: POItem[];
}

interface SummaryItem {
  status: POStatus;
  _count: { id: number };
  _sum: { totalAmount: number | string | null };
}

interface POFormItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: string;
  description?: string | null;
}

const statusLabels: Record<POStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const formatRupiah = (amount: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (date?: string | null) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "Terjadi kesalahan saat menghubungi server."
    );
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
};

const getAllowedStatuses = (status: POStatus): POStatus[] => {
  const transitions: Record<POStatus, POStatus[]> = {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  return transitions[status];
};

interface PurchaseOrdersProps {
  onNavigate?: (page: string) => void;
}

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    vendorId: "",
    requisitionId: "",
    tax: "0",
    notes: "",
    deliveryDate: "",
  });

  const [formItems, setFormItems] = useState<POFormItem[]>([]);

  // =====================================
  // LOAD PURCHASE ORDERS
  // =====================================

  const loadOrders = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params: Record<string, string> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const response = await api.get("/purchase-orders", { params });

      setOrders(response.data.data || []);
      setSummary(response.data.summary || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // LOAD VENDORS & REQUISITIONS
  // =====================================

  const loadOptions = async () => {
    try {
      const response = await api.get("/purchase-orders/options");

      setVendors(response.data.data.vendors || []);
      setRequisitions(response.data.data.requisitions || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadOrders();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search, statusFilter]);

  // =====================================
  // SUMMARY
  // =====================================

  const getStatusCount = (status: POStatus) => {
    return summary.find((item) => item.status === status)?._count.id || 0;
  };

  const totalOrders = summary.reduce(
    (total, item) => total + item._count.id,
    0,
  );

  // =====================================
  // SELECT REQUISITION
  // =====================================

  const handleRequisitionChange = (requisitionId: string) => {
    const requisition = requisitions.find(
      (item) => item.id === Number(requisitionId),
    );

    setForm((previous) => ({
      ...previous,
      requisitionId,
    }));

    if (!requisition) {
      setFormItems([]);
      return;
    }

    setFormItems(
      requisition.items.map((item) => ({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: String(item.estimatedUnitPrice),
      })),
    );
  };

  // =====================================
  // CALCULATE TOTAL
  // =====================================

  const subtotal = useMemo(() => {
    return formItems.reduce((total, item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.unitPrice);

      return total + quantity * price;
    }, 0);
  }, [formItems]);

  const taxAmount = Number(form.tax || 0);
  const totalAmount = subtotal + taxAmount;

  // =====================================
  // RESET FORM
  // =====================================

  const resetForm = () => {
    setForm({
      vendorId: "",
      requisitionId: "",
      tax: "0",
      notes: "",
      deliveryDate: "",
    });

    setFormItems([]);
    setEditingId(null);
    setShowForm(false);
  };

  // =====================================
  // CREATE PURCHASE ORDER
  // =====================================

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.vendorId || !form.requisitionId) {
      alert("Pilih Vendor dan Requisition terlebih dahulu.");
      return;
    }

    if (!formItems.length) {
      alert("Requisition belum memiliki item.");
      return;
    }

    if (
      formItems.some(
        (item) =>
          !Number.isFinite(Number(item.unitPrice)) ||
          Number(item.unitPrice) < 0,
      )
    ) {
      alert("Pastikan semua harga satuan valid.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const payload = {
        vendorId: Number(form.vendorId),
        requisitionId: Number(form.requisitionId),
        tax: Number(form.tax || 0),
        notes: form.notes,
        deliveryDate: form.deliveryDate || null,
        items: formItems.map((item) => ({
          unitPrice: Number(item.unitPrice),
        })),
      };

      if (editingId) {
        await api.put(`/purchase-orders/${editingId}`, {
          vendorId: payload.vendorId,
          tax: payload.tax,
          notes: payload.notes,
          deliveryDate: payload.deliveryDate,
          items: payload.items,
        });

        setSuccessMessage("Purchase Order berhasil diperbarui.");
      } else {
        await api.post("/purchase-orders", payload);

        setSuccessMessage("Purchase Order berhasil dibuat.");
      }

      resetForm();
      await loadOrders();
      await loadOptions();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // EDIT DRAFT PURCHASE ORDER
  // =====================================

  const handleEdit = (order: PurchaseOrder) => {
    if (order.status !== "DRAFT") {
      alert("Hanya PO berstatus DRAFT yang dapat diedit.");
      return;
    }

    setEditingId(order.id);

    setForm({
      vendorId: String(order.vendorId),
      requisitionId: String(order.requisitionId),
      tax: String(order.tax),
      notes: order.notes || "",
      deliveryDate: order.deliveryDate ? order.deliveryDate.slice(0, 10) : "",
    });

    setFormItems(
      order.items.map((item) => ({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: String(item.unitPrice),
      })),
    );

    setShowForm(true);
    setSelectedOrder(null);
  };

  // =====================================
  // UPDATE ITEM PRICE
  // =====================================

  const updateItemPrice = (index: number, value: string) => {
    setFormItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, unitPrice: value } : item,
      ),
    );
  };

  // =====================================
  // UPDATE STATUS
  // =====================================

  const updateStatus = async (order: PurchaseOrder, status: POStatus) => {
    if (!getAllowedStatuses(order.status).includes(status)) {
      alert("Perubahan status tersebut tidak diperbolehkan.");
      return;
    }

    const confirmed = window.confirm(
      `Ubah status ${order.poNumber} menjadi ${statusLabels[status]}?`,
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");

      await api.patch(`/purchase-orders/${order.id}/status`, {
        status,
      });

      setSuccessMessage("Status Purchase Order berhasil diperbarui.");

      await loadOrders();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  // =====================================
  // VIEW DETAIL
  // =====================================

  const handleViewDetail = async (id: number) => {
    try {
      const response = await api.get(`/purchase-orders/${id}`);

      setSelectedOrder(response.data.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="po-page">
      {/* HEADER */}
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
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          type="button"
        >
          + Create Purchase Order
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="po-alert po-alert-error">
          {errorMessage}
          <button onClick={() => setErrorMessage("")}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="po-alert po-alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="po-stats">
        <div className="po-stat-card">
          <span>Total Purchase Orders</span>
          <strong>{totalOrders}</strong>
          <small>Seluruh pesanan</small>
        </div>

        <div className="po-stat-card">
          <span>Draft Orders</span>
          <strong>{getStatusCount("DRAFT")}</strong>
          <small>Belum dikirim</small>
        </div>

        <div className="po-stat-card">
          <span>Sent Orders</span>
          <strong>{getStatusCount("SENT")}</strong>
          <small>Sudah dikirim ke vendor</small>
        </div>

        <div className="po-stat-card">
          <span>Completed Orders</span>
          <strong>{getStatusCount("COMPLETED")}</strong>
          <small>Pesanan selesai</small>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <div className="po-form-card">
          <div className="po-section-heading">
            <div>
              <h2>
                {editingId ? "Edit Purchase Order" : "Create Purchase Order"}
              </h2>
              <p>Masukkan informasi pesanan pembelian.</p>
            </div>

            <button
              className="po-close-button"
              onClick={resetForm}
              type="button"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className="po-form-grid">
              <label>
                Vendor
                <select
                  value={form.vendorId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vendorId: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Pilih Vendor</option>

                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendorCode} - {vendor.companyName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Requisition Number
                <select
                  value={form.requisitionId}
                  onChange={(event) =>
                    handleRequisitionChange(event.target.value)
                  }
                  disabled={Boolean(editingId)}
                  required
                >
                  <option value="">Pilih Requisition</option>

                  {requisitions.map((requisition) => (
                    <option key={requisition.id} value={requisition.id}>
                      {requisition.requestNumber} - {requisition.title}
                    </option>
                  ))}

                  {editingId && (
                    <option value={form.requisitionId}>
                      {selectedOrder?.requisition.requestNumber ||
                        "Requisition terpilih"}
                    </option>
                  )}
                </select>
              </label>

              <label>
                Delivery Date
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      deliveryDate: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Tax (Rp)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tax: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Notes
                <input
                  type="text"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Catatan pesanan"
                />
              </label>
            </div>

            {/* ITEMS */}
            {formItems.length > 0 && (
              <div className="po-items-section">
                <div className="po-section-heading">
                  <div>
                    <h2>Purchase Order Items</h2>
                    <p>Harga satuan dapat disesuaikan.</p>
                  </div>
                </div>

                <div className="po-table-wrapper">
                  <table className="po-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>QUANTITY</th>
                        <th>UNIT</th>
                        <th>UNIT PRICE</th>
                        <th>TOTAL</th>
                      </tr>
                    </thead>

                    <tbody>
                      {formItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.itemName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(event) =>
                                updateItemPrice(index, event.target.value)
                              }
                              required
                            />
                          </td>
                          <td className="po-amount">
                            {formatRupiah(
                              item.quantity * Number(item.unitPrice || 0),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="po-total-summary">
                  <p>
                    Subtotal: <strong>{formatRupiah(subtotal)}</strong>
                  </p>

                  <p>
                    Tax: <strong>{formatRupiah(taxAmount)}</strong>
                  </p>

                  <h3>
                    Grand Total: <strong>{formatRupiah(totalAmount)}</strong>
                  </h3>
                </div>
              </div>
            )}

            <div className="po-form-actions">
              <button
                type="button"
                className="po-secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="po-primary-button"
                disabled={saving || formItems.length === 0}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Purchase Order"
                    : "Save Purchase Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PURCHASE ORDER LIST */}
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
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="po-empty">
                    Loading Purchase Orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="po-number">{order.poNumber}</td>

                    <td>{order.vendor?.companyName || "-"}</td>

                    <td>{order.requisition?.requestNumber || "-"}</td>

                    <td>{formatDate(order.orderDate)}</td>

                    <td className="po-amount">
                      {formatRupiah(order.totalAmount)}
                    </td>

                    <td>
                      <span
                        className={`po-status ${order.status.toLowerCase()}`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </td>

                    <td>
                      <div className="po-action-group">
                        <button
                          type="button"
                          className="po-secondary-button"
                          onClick={() => handleViewDetail(order.id)}
                        >
                          Detail
                        </button>

                        {order.status === "DRAFT" && (
                          <button
                            type="button"
                            className="po-secondary-button"
                            onClick={() => handleEdit(order)}
                          >
                            Edit
                          </button>
                        )}

                        {getAllowedStatuses(order.status).length > 0 && (
                          <select
                            className="po-action-select"
                            value=""
                            aria-label={`Update status ${order.poNumber}`}
                            onChange={(event) =>
                              updateStatus(
                                order,
                                event.target.value as POStatus,
                              )
                            }
                          >
                            <option value="" disabled>
                              Update Status
                            </option>

                            {getAllowedStatuses(order.status).map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
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
          Menampilkan {orders.length} Purchase Orders
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="po-modal-overlay">
          <div className="po-detail-modal">
            <div className="po-section-heading">
              <div>
                <h2>Purchase Order Detail</h2>
                <p>{selectedOrder.poNumber}</p>
              </div>

              <button
                className="po-close-button"
                onClick={() => setSelectedOrder(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="po-detail-grid">
              <div>
                <small>Vendor</small>
                <strong>{selectedOrder.vendor.companyName}</strong>
              </div>

              <div>
                <small>Requisition</small>
                <strong>{selectedOrder.requisition.requestNumber}</strong>
              </div>

              <div>
                <small>Order Date</small>
                <strong>{formatDate(selectedOrder.orderDate)}</strong>
              </div>

              <div>
                <small>Delivery Date</small>
                <strong>{formatDate(selectedOrder.deliveryDate)}</strong>
              </div>

              <div>
                <small>Department</small>
                <strong>{selectedOrder.requisition.department}</strong>
              </div>

              <div>
                <small>Status</small>
                <strong>{statusLabels[selectedOrder.status]}</strong>
              </div>
            </div>

            <h3>Order Items</h3>

            <div className="po-table-wrapper">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>QTY</th>
                    <th>UNIT PRICE</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemName}</td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      <td>{formatRupiah(item.unitPrice)}</td>
                      <td>{formatRupiah(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="po-total-summary">
              <p>
                Subtotal:{" "}
                <strong>{formatRupiah(selectedOrder.subtotal)}</strong>
              </p>

              <p>
                Tax: <strong>{formatRupiah(selectedOrder.tax)}</strong>
              </p>

              <h3>
                Grand Total:{" "}
                <strong>{formatRupiah(selectedOrder.totalAmount)}</strong>
              </h3>
            </div>

            {selectedOrder.notes && (
              <p>
                <strong>Notes:</strong> {selectedOrder.notes}
              </p>
            )}

            <div className="po-form-actions">
              {selectedOrder.status === "DRAFT" && (
                <button
                  className="po-secondary-button"
                  type="button"
                  onClick={() => handleEdit(selectedOrder)}
                >
                  Edit PO
                </button>
              )}

              <button
                className="po-primary-button"
                type="button"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

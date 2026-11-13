import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/requisitions.css";

interface RequisitionItem {
  id?: number;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
}

interface Requisition {
  id: number;
  requestNumber: string;
  title: string;
  description?: string;
  department: string;
  neededDate?: string;
  status: string;
  requestedBy?: { name: string };
  items: RequisitionItem[];
  createdAt: string;
}

const emptyItem: RequisitionItem = {
  itemName: "",
  description: "",
  quantity: 1,
  unit: "Unit",
  estimatedUnitPrice: 0,
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export default function Requisitions({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    neededDate: "",
    items: [{ ...emptyItem }],
  });

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/requisitions");
      setRequisitions(response.data.data || []);
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil data requisitions.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      department: "",
      neededDate: "",
      items: [{ ...emptyItem }],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const updateItem = (
    index: number,
    field: keyof RequisitionItem,
    value: string | number,
  ) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, i) => i !== index),
    }));
  };

  const openEditForm = (item: Requisition) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      department: item.department,
      neededDate: item.neededDate ? item.neededDate.slice(0, 10) : "",
      items: item.items.map((detail) => ({
        itemName: detail.itemName,
        description: detail.description || "",
        quantity: detail.quantity,
        unit: detail.unit,
        estimatedUnitPrice: Number(detail.estimatedUnitPrice),
      })),
    });
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.department.trim() ||
      form.items.length === 0 ||
      form.items.some(
        (item) =>
          !item.itemName.trim() ||
          item.quantity < 1 ||
          item.estimatedUnitPrice < 0,
      )
    ) {
      setError("Lengkapi data permintaan dan item dengan benar.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        neededDate: form.neededDate || null,
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedUnitPrice: Number(item.estimatedUnitPrice),
        })),
      };

      if (editingId) {
        await api.put(`/requisitions/${editingId}`, payload);
      } else {
        await api.post("/requisitions", payload);
      }

      resetForm();
      await fetchRequisitions();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal menyimpan permintaan pengadaan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequest = async (id: number) => {
    if (!window.confirm("Ajukan permintaan pengadaan ini?")) return;

    try {
      await api.post(`/requisitions/${id}/submit`);
      await fetchRequisitions();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengajukan permintaan.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus permintaan ini?")) return;

    try {
      await api.delete(`/requisitions/${id}`);
      await fetchRequisitions();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus permintaan.");
    }
  };

  const filteredRequisitions = requisitions.filter((item) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      item.requestNumber.toLowerCase().includes(keyword) ||
      item.title.toLowerCase().includes(keyword) ||
      item.department.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "ALL" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTotal = (items: RequisitionItem[]) =>
    items.reduce(
      (total, item) => total + item.quantity * Number(item.estimatedUnitPrice),
      0,
    );

  return (
    <div className="requisition-page">
      <div className="requisition-heading">
        <div>
          <span className="page-eyebrow">PROCUREMENT MANAGEMENT</span>
          <h1>Purchase Requisitions</h1>
          <p>Kelola dan pantau seluruh permintaan pengadaan barang.</p>
        </div>

        <button
          className="req-primary-button"
          onClick={() => {
            setEditingId(null);
            setForm({
              title: "",
              description: "",
              department: "",
              neededDate: "",
              items: [{ ...emptyItem }],
            });
            setShowForm(true);
          }}
        >
          + New Requisition
        </button>
      </div>

      <div className="req-stats">
        <div className="req-stat-card">
          <span>Total Requests</span>
          <strong>{requisitions.length}</strong>
        </div>
        <div className="req-stat-card">
          <span>Pending</span>
          <strong>
            {requisitions.filter((r) => r.status === "PENDING").length}
          </strong>
        </div>
        <div className="req-stat-card">
          <span>Approved</span>
          <strong>
            {requisitions.filter((r) => r.status === "APPROVED").length}
          </strong>
        </div>
        <div className="req-stat-card">
          <span>Rejected</span>
          <strong>
            {requisitions.filter((r) => r.status === "REJECTED").length}
          </strong>
        </div>
      </div>

      {error && <div className="req-error">{error}</div>}

      {showForm && (
        <form className="req-form-card" onSubmit={handleSubmit}>
          <div className="req-form-heading">
            <div>
              <h2>{editingId ? "Edit Requisition" : "Create Requisition"}</h2>
              <p>Masukkan informasi dan daftar barang yang dibutuhkan.</p>
            </div>
            <button type="button" className="req-close" onClick={resetForm}>
              ×
            </button>
          </div>

          <div className="req-form-grid">
            <label>
              Request Title *
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Pengadaan Peralatan IT"
                required
              />
            </label>

            <label>
              Department *
              <input
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                placeholder="Contoh: IT Department"
                required
              />
            </label>

            <label>
              Needed Date
              <input
                type="date"
                value={form.neededDate}
                onChange={(e) =>
                  setForm({ ...form, neededDate: e.target.value })
                }
              />
            </label>

            <label className="req-full-width">
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Jelaskan kebutuhan pengadaan..."
                rows={3}
              />
            </label>
          </div>

          <div className="req-items-heading">
            <h3>Requested Items</h3>
            <button type="button" className="req-add-item" onClick={addItem}>
              + Add Item
            </button>
          </div>

          {form.items.map((item, index) => (
            <div className="req-item-row" key={index}>
              <label>
                Item Name *
                <input
                  value={item.itemName}
                  onChange={(e) =>
                    updateItem(index, "itemName", e.target.value)
                  }
                  placeholder="Nama barang"
                  required
                />
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", Number(e.target.value))
                  }
                  required
                />
              </label>

              <label>
                Unit
                <input
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                  required
                />
              </label>

              <label>
                Estimated Price
                <input
                  type="number"
                  min="0"
                  value={item.estimatedUnitPrice}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "estimatedUnitPrice",
                      Number(e.target.value),
                    )
                  }
                  required
                />
              </label>

              <button
                type="button"
                className="req-remove-item"
                onClick={() => removeItem(index)}
                disabled={form.items.length === 1}
                title="Remove item"
              >
                ×
              </button>
            </div>
          ))}

          <div className="req-form-actions">
            <button
              type="button"
              className="req-secondary-button"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="req-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Request"
                  : "Save Draft"}
            </button>
          </div>
        </form>
      )}

      {selectedRequisition && (
        <div
          className="req-modal-overlay"
          onClick={() => setSelectedRequisition(null)}
        >
          <div
            className="req-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="req-detail-header">
              <div>
                <span className="page-eyebrow">REQUISITION DETAIL</span>
                <h2>{selectedRequisition.requestNumber}</h2>
                <p>Informasi lengkap permintaan pengadaan.</p>
              </div>

              <button
                type="button"
                className="req-close"
                onClick={() => setSelectedRequisition(null)}
              >
                ×
              </button>
            </div>

            <div className="req-detail-grid">
              <div>
                <span>Request Title</span>
                <strong>{selectedRequisition.title}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{selectedRequisition.department}</strong>
              </div>

              <div>
                <span>Requested By</span>
                <strong>
                  {selectedRequisition.requestedBy?.name || "User"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedRequisition.status}</strong>
              </div>

              <div>
                <span>Needed Date</span>
                <strong>
                  {selectedRequisition.neededDate
                    ? new Date(
                        selectedRequisition.neededDate,
                      ).toLocaleDateString("id-ID")
                    : "-"}
                </strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>
                  {new Date(selectedRequisition.createdAt).toLocaleDateString(
                    "id-ID",
                  )}
                </strong>
              </div>

              <div className="req-detail-description">
                <span>Description</span>
                <p>{selectedRequisition.description || "-"}</p>
              </div>
            </div>

            <div className="req-detail-items">
              <h3>Requested Items</h3>

              <div className="req-table-wrapper">
                <table className="req-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Estimated Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedRequisition.items.map((detail, index) => (
                      <tr key={detail.id || index}>
                        <td>
                          <strong>{detail.itemName}</strong>
                          <small>{detail.description || "-"}</small>
                        </td>

                        <td>{detail.quantity}</td>
                        <td>{detail.unit}</td>
                        <td>
                          {formatRupiah(Number(detail.estimatedUnitPrice))}
                        </td>
                        <td>
                          {formatRupiah(
                            detail.quantity * Number(detail.estimatedUnitPrice),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={4}>Estimated Total</td>
                      <td>
                        <strong>
                          {formatRupiah(
                            getTotal(selectedRequisition.items || []),
                          )}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="req-detail-footer">
              {selectedRequisition.status === "PENDING" && (
                <button
                  type="button"
                  className="req-approve"
                  onClick={() => {
                    setSelectedRequisition(null);
                    onNavigate("approvals");
                  }}
                >
                  Proses Approval
                </button>
              )}

              <button
                type="button"
                className="req-secondary-button"
                onClick={() => setSelectedRequisition(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="req-table-card">
        <div className="req-table-heading">
          <div>
            <h2>All Requisitions</h2>
            <p>Daftar permintaan pengadaan perusahaan.</p>
          </div>

          <div className="req-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="req-empty">Loading requisitions...</div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="req-empty">
            <strong>No requisitions found</strong>
            <p>Belum ada permintaan yang sesuai dengan pencarian.</p>
          </div>
        ) : (
          <div className="req-table-wrapper">
            <table className="req-table">
              <thead>
                <tr>
                  <th>Request Number</th>
                  <th>Request Title</th>
                  <th>Department</th>
                  <th>Items</th>
                  <th>Estimated Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequisitions.map((item) => (
                  <tr key={item.id}>
                    <td className="req-number">{item.requestNumber}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.requestedBy?.name || "User"}</small>
                    </td>
                    <td>{item.department}</td>
                    <td>{item.items?.length || 0} items</td>
                    <td className="req-total">
                      {formatRupiah(getTotal(item.items || []))}
                    </td>
                    <td>
                      <span
                        className={`req-status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="req-actions">
                        {/* Tombol Detail untuk semua status */}
                        <button
                          type="button"
                          className="req-view"
                          onClick={() => setSelectedRequisition(item)}
                          title="Lihat Detail"
                        >
                          Detail
                        </button>

                        {/* Tombol khusus DRAFT */}
                        {item.status === "DRAFT" && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              title="Edit"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSubmitRequest(item.id)}
                              title="Submit"
                            >
                              Submit
                            </button>

                            <button
                              type="button"
                              className="req-delete"
                              onClick={() => handleDelete(item.id)}
                              title="Delete"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {/* Tombol khusus PENDING */}
                        {item.status === "PENDING" && (
                          <button
                            type="button"
                            className="req-approve"
                            onClick={() => onNavigate("approvals")}
                            title="Proses Approval"
                          >
                            Proses Approval
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

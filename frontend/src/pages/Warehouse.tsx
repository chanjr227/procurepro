import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/warehouse.css";

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  address?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: {
    stocks: number;
    goodsReceipts: number;
    transactions: number;
  };
}

interface WarehouseForm {
  warehouseCode: string;
  warehouseName: string;
  address: string;
  description: string;
}

const initialForm: WarehouseForm = {
  warehouseCode: "",
  warehouseName: "",
  address: "",
  description: "",
};

// Menampilkan dan mengelola daftar gudang.
export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WarehouseForm>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Memuat data gudang dari backend.
  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/warehouses");
      const result = response.data?.data;

      setWarehouses(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const filteredWarehouses = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return warehouses;

    return warehouses.filter((warehouse) =>
      [
        warehouse.warehouseCode,
        warehouse.warehouseName,
        warehouse.address || "",
        warehouse.description || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [warehouses, search]);

  const activeWarehouses = warehouses.filter(
    (warehouse) => warehouse.isActive,
  ).length;

  const totalStockRecords = warehouses.reduce(
    (total, warehouse) => total + (warehouse._count?.stocks || 0),
    0,
  );

  // Membuka formulir untuk menambahkan gudang.
  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  // Membuka formulir dengan data gudang yang dipilih.
  const openEditModal = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      warehouseCode: warehouse.warehouseCode || "",
      warehouseName: warehouse.warehouseName || "",
      address: warehouse.address || "",
      description: warehouse.description || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Menyimpan data gudang baru atau perubahan gudang.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.warehouseCode.trim() || !form.warehouseName.trim()) {
      setError("Kode dan nama gudang wajib diisi.");
      return;
    }

    const payload = {
      warehouseCode: form.warehouseCode.trim(),
      warehouseName: form.warehouseName.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    };

    try {
      setSaving(true);
      setError("");

      if (editingId !== null) {
        await api.put(`/warehouses/${editingId}`, payload);
        setSuccess("Data gudang berhasil diperbarui.");
      } else {
        await api.post("/warehouses", payload);
        setSuccess("Gudang berhasil ditambahkan.");
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingId(null);

      await loadWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data gudang.");
    } finally {
      setSaving(false);
    }
  };

  // Mengaktifkan atau menonaktifkan gudang yang dipilih.
  const toggleWarehouseStatus = async (warehouse: Warehouse) => {
    const newStatus = !warehouse.isActive;
    const confirmation = window.confirm(
      `Apakah kamu yakin ingin ${
        newStatus ? "mengaktifkan" : "menonaktifkan"
      } gudang ${warehouse.warehouseName}?`,
    );

    if (!confirmation) return;

    try {
      setError("");
      setSuccess("");

      await api.put(`/warehouses/${warehouse.id}`, {
        isActive: newStatus,
      });

      setSuccess(
        `Gudang berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`,
      );

      await loadWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengubah status gudang.");
    }
  };

  return (
    <div className="warehouse-page">
      <div className="warehouse-page-heading">
        <div>
          <p className="warehouse-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>Warehouse Management</h1>
          <p className="warehouse-subtitle">
            Kelola lokasi penyimpanan dan informasi gudang perusahaan.
          </p>
        </div>

        <button
          type="button"
          className="warehouse-primary-button"
          onClick={openCreateModal}
        >
          <span>＋</span> Add Warehouse
        </button>
      </div>

      {success && (
        <div className="warehouse-alert success-alert">{success}</div>
      )}

      {error && !showModal && (
        <div className="warehouse-alert error-alert">{error}</div>
      )}

      <div className="warehouse-summary">
        <div className="warehouse-summary-card">
          <div className="warehouse-summary-icon">▦</div>
          <div>
            <span>Total Warehouses</span>
            <strong>{warehouses.length}</strong>
            <small>Gudang terdaftar</small>
          </div>
        </div>

        <div className="warehouse-summary-card">
          <div className="warehouse-summary-icon">✓</div>
          <div>
            <span>Active Warehouses</span>
            <strong>{activeWarehouses}</strong>
            <small>Gudang aktif</small>
          </div>
        </div>

        <div className="warehouse-summary-card">
          <div className="warehouse-summary-icon">▤</div>
          <div>
            <span>Stock Records</span>
            <strong>{totalStockRecords}</strong>
            <small>Catatan stok per gudang</small>
          </div>
        </div>
      </div>

      <section className="warehouse-panel">
        <div className="warehouse-panel-heading">
          <div>
            <h2>Warehouse List</h2>
            <p>Daftar seluruh gudang yang terdaftar di sistem.</p>
          </div>

          <label className="warehouse-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Cari kode, nama, alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="warehouse-table-wrapper">
          <table className="warehouse-table">
            <thead>
              <tr>
                <th>WAREHOUSE</th>
                <th>ADDRESS</th>
                <th>STOCK RECORDS</th>
                <th>GOODS RECEIPTS</th>
                <th>TRANSACTIONS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="warehouse-empty">
                    Memuat data gudang...
                  </td>
                </tr>
              ) : filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="warehouse-empty">
                    {search
                      ? "Tidak ada gudang yang sesuai dengan pencarian."
                      : "Belum ada data gudang. Silakan tambahkan gudang."}
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td>
                      <div className="warehouse-identity">
                        <div className="warehouse-row-icon">▦</div>
                        <div>
                          <strong>{warehouse.warehouseName}</strong>
                          <small>{warehouse.warehouseCode}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="warehouse-address">
                        {warehouse.address || "-"}
                      </span>
                    </td>

                    <td>{warehouse._count?.stocks ?? 0}</td>
                    <td>{warehouse._count?.goodsReceipts ?? 0}</td>
                    <td>{warehouse._count?.transactions ?? 0}</td>

                    <td>
                      <span
                        className={`warehouse-status ${
                          warehouse.isActive ? "active" : "inactive"
                        }`}
                      >
                        {warehouse.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="warehouse-actions">
                        <button
                          type="button"
                          className="warehouse-edit-button"
                          onClick={() => openEditModal(warehouse)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`warehouse-toggle-button ${
                            warehouse.isActive ? "deactivate" : "activate"
                          }`}
                          onClick={() => toggleWarehouseStatus(warehouse)}
                        >
                          {warehouse.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="warehouse-table-footer">
          Menampilkan {filteredWarehouses.length} dari {warehouses.length}{" "}
          gudang
        </div>
      </section>

      {showModal && (
        <div
          className="warehouse-modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="warehouse-modal" onClick={(e) => e.stopPropagation()}>
            <div className="warehouse-modal-heading">
              <div>
                <h2>
                  {editingId !== null ? "Edit Warehouse" : "Add New Warehouse"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Perbarui informasi gudang."
                    : "Masukkan informasi gudang baru."}
                </p>
              </div>

              <button
                type="button"
                className="warehouse-close-button"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="warehouse-alert error-alert">{error}</div>
              )}

              <div className="warehouse-form-grid">
                <label>
                  Warehouse Code <span>*</span>
                  <input
                    name="warehouseCode"
                    value={form.warehouseCode}
                    onChange={handleChange}
                    placeholder="Contoh: WH-001"
                    required
                  />
                </label>

                <label>
                  Warehouse Name <span>*</span>
                  <input
                    name="warehouseName"
                    value={form.warehouseName}
                    onChange={handleChange}
                    placeholder="Contoh: Gudang Utama"
                    required
                  />
                </label>

                <label className="warehouse-full-width">
                  Address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Masukkan alamat gudang"
                    rows={3}
                  />
                </label>

                <label className="warehouse-full-width">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Keterangan gudang (opsional)"
                    rows={3}
                  />
                </label>
              </div>

              <div className="warehouse-modal-actions">
                <button
                  type="button"
                  className="warehouse-cancel-button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="warehouse-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Add Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

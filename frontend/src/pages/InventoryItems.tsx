import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/inventory.css";

interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  description?: string | null;
  category: string;
  unit: string;
  minimumStock: number;
  isActive?: boolean;
}

interface InventoryForm {
  itemCode: string;
  itemName: string;
  description: string;
  category: string;
  unit: string;
  minimumStock: string;
}

const initialForm: InventoryForm = {
  itemCode: "",
  itemName: "",
  description: "",
  category: "",
  unit: "Unit",
  minimumStock: "0",
};

export default function InventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InventoryForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadItems = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/inventory");
      const result = response.data?.data;

      setItems(Array.isArray(result) ? result : result?.items || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil data Inventory Items.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return items;

    return items.filter((item) =>
      [item.itemCode, item.itemName, item.category, item.unit]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [items, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      description: item.description || "",
      category: item.category || "",
      unit: item.unit || "Unit",
      minimumStock: String(item.minimumStock ?? 0),
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !form.itemCode.trim() ||
      !form.itemName.trim() ||
      !form.category.trim() ||
      !form.unit.trim()
    ) {
      setError("Mohon lengkapi semua field wajib.");
      return;
    }

    const minimumStock = Number(form.minimumStock);

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      setError("Minimum stock harus berupa angka nol atau lebih.");
      return;
    }

    const payload = {
      itemCode: form.itemCode.trim(),
      itemName: form.itemName.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      minimumStock,
    };

    try {
      setSaving(true);
      setError("");

      if (editingId !== null) {
        await api.put(`/inventory/${editingId}`, payload);
        setSuccess("Inventory Item berhasil diperbarui.");
      } else {
        await api.post("/inventory", payload);
        setSuccess("Inventory Item berhasil ditambahkan.");
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingId(null);
      await loadItems();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Gagal menyimpan Inventory Item. Periksa kembali data yang dimasukkan.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="inventory-page-heading">
        <div>
          <p className="inventory-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>Inventory Items</h1>
          <p className="inventory-subtitle">
            Kelola daftar barang yang digunakan dalam proses procurement.
          </p>
        </div>

        <button
          type="button"
          className="inventory-primary-button"
          onClick={openCreateModal}
        >
          <span>＋</span> Add New Item
        </button>
      </div>

      {success && (
        <div className="inventory-alert success-alert">{success}</div>
      )}

      {error && !showModal && (
        <div className="inventory-alert error-alert">{error}</div>
      )}

      <div className="inventory-summary">
        <div className="inventory-summary-card">
          <div className="inventory-summary-icon">▤</div>
          <div>
            <span>Total Inventory Items</span>
            <strong>{items.length}</strong>
            <small>Barang terdaftar</small>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon">▦</div>
          <div>
            <span>Categories</span>
            <strong>
              {new Set(items.map((item) => item.category).filter(Boolean)).size}
            </strong>
            <small>Kategori barang</small>
          </div>
        </div>

        <div className="inventory-summary-card">
          <div className="inventory-summary-icon">⌕</div>
          <div>
            <span>Search Results</span>
            <strong>{filteredItems.length}</strong>
            <small>Barang ditemukan</small>
          </div>
        </div>
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Item List</h2>
            <p>Daftar seluruh barang yang terdaftar di sistem.</p>
          </div>

          <label className="inventory-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Cari kode, nama, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>ITEM CODE</th>
                <th>ITEM NAME</th>
                <th>CATEGORY</th>
                <th>UNIT</th>
                <th>MINIMUM STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="inventory-empty">
                    Memuat data inventory...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="inventory-empty">
                    {search
                      ? "Tidak ada barang yang sesuai dengan pencarian."
                      : "Belum ada Inventory Item. Silakan tambahkan barang."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="inventory-code">{item.itemCode}</td>
                    <td>
                      <strong>{item.itemName}</strong>
                      {item.description && (
                        <small className="inventory-description">
                          {item.description}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className="inventory-category">
                        {item.category}
                      </span>
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.minimumStock}</td>
                    <td>
                      <span
                        className={`inventory-status ${
                          item.isActive === false ? "inactive" : "active"
                        }`}
                      >
                        {item.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="inventory-edit-button"
                        onClick={() => openEditModal(item)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="inventory-table-footer">
          Menampilkan {filteredItems.length} dari {items.length} barang
        </div>
      </section>

      {showModal && (
        <div
          className="inventory-modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-heading">
              <div>
                <h2>
                  {editingId !== null ? "Edit Inventory Item" : "Add New Item"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Perbarui informasi barang."
                    : "Masukkan informasi barang baru."}
                </p>
              </div>

              <button
                type="button"
                className="inventory-close-button"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="inventory-alert error-alert">{error}</div>
              )}

              <div className="inventory-form-grid">
                <label>
                  Item Code <span>*</span>
                  <input
                    name="itemCode"
                    value={form.itemCode}
                    onChange={handleChange}
                    placeholder="Contoh: ATK-001"
                    required
                  />
                </label>

                <label>
                  Item Name <span>*</span>
                  <input
                    name="itemName"
                    value={form.itemName}
                    onChange={handleChange}
                    placeholder="Contoh: Kertas A4"
                    required
                  />
                </label>

                <label>
                  Category <span>*</span>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="Contoh: ATK"
                    required
                  />
                </label>

                <label>
                  Unit <span>*</span>
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="Unit">Unit</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Rim">Rim</option>
                    <option value="Pack">Pack</option>
                    <option value="Set">Set</option>
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                  </select>
                </label>

                <label>
                  Minimum Stock <span>*</span>
                  <input
                    type="number"
                    name="minimumStock"
                    min="0"
                    value={form.minimumStock}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="inventory-full-width">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Keterangan barang (opsional)"
                    rows={3}
                  />
                </label>
              </div>

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

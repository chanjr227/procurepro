import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/stock-opname.css";

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
}

interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  unit: string;
}

interface OpnameItem {
  id: number;
  inventoryItemId: number;
  systemStock: number;
  physicalStock: number;
  difference: number;
  inventoryItem: InventoryItem;
}

interface StockOpname {
  id: number;
  opnameNumber: string;
  warehouseId: number;
  warehouse: Warehouse;
  opnameDate: string;
  notes?: string | null;
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  items?: OpnameItem[];
  _count?: {
    items: number;
  };
}

// Menampilkan dan mengelola sesi stock opname.
export default function StockOpname() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(
    null,
  );

  const [physicalValues, setPhysicalValues] = useState<Record<number, string>>(
    {},
  );

  const [showForm, setShowForm] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [opnameDate, setOpnameDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Memuat daftar sesi stock opname.
  const loadOpnames = async () => {
    try {
      const response = await api.get("/stock-opnames");
      setOpnames(response.data?.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil data Stock Opname",
      );
    }
  };

  // Memuat daftar gudang untuk sesi stock opname.
  const loadWarehouses = async () => {
    try {
      const response = await api.get("/warehouses");
      setWarehouses(
        (response.data?.data || []).filter(
          (warehouse: Warehouse & { isActive?: boolean }) =>
            warehouse.isActive !== false,
        ),
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data gudang");
    }
  };

  // Memuat data utama stock opname dan pilihan gudang.
  const loadData = async () => {
    setLoading(true);
    setError("");

    await Promise.all([loadOpnames(), loadWarehouses()]);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Memuat rincian sesi stock opname yang dipilih.
  const openDetail = async (id: number) => {
    try {
      setError("");
      setSuccess("");

      const response = await api.get(`/stock-opnames/${id}`);
      const opname: StockOpname = response.data.data;

      setSelectedOpname(opname);

      const values: Record<number, string> = {};
      (opname.items || []).forEach((item) => {
        values[item.id] = String(item.physicalStock);
      });

      setPhysicalValues(values);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil detail Stock Opname",
      );
    }
  };

  // Membuat sesi stock opname baru.
  const createOpname = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) {
      setError("Silakan pilih gudang terlebih dahulu");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.post("/stock-opnames", {
        warehouseId: Number(warehouseId),
        opnameDate,
        notes,
      });

      setSuccess(response.data?.message || "Stock Opname berhasil dibuat");

      setShowForm(false);
      setWarehouseId("");
      setNotes("");

      await loadOpnames();

      if (response.data?.data?.id) {
        await openDetail(response.data.data.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal membuat Stock Opname");
    } finally {
      setSaving(false);
    }
  };

  // Menyimpan jumlah stok hasil penghitungan fisik.
  const updatePhysicalStock = async (item: OpnameItem) => {
    const value = physicalValues[item.id];

    if (value === undefined || value.trim() === "") {
      setError("Stok fisik tidak boleh kosong");
      return;
    }

    const physicalStock = Number(value);

    if (!Number.isInteger(physicalStock) || physicalStock < 0) {
      setError("Stok fisik harus berupa angka bulat minimal 0");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.put(`/stock-opnames/${selectedOpname?.id}/items/${item.id}`, {
        physicalStock,
      });

      setSuccess(`Hasil stok ${item.inventoryItem.itemName} berhasil disimpan`);

      if (selectedOpname) {
        await openDetail(selectedOpname.id);
      }

      await loadOpnames();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan stok fisik");
    } finally {
      setSaving(false);
    }
  };

  // Menyelesaikan sesi stock opname dan menerapkan hasil hitung.
  const completeOpname = async () => {
    if (!selectedOpname) return;

    const confirmed = window.confirm(
      "Selesaikan Stock Opname ini? Stok gudang akan disesuaikan berdasarkan hasil hitung fisik.",
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/stock-opnames/${selectedOpname.id}/complete`,
      );

      setSuccess(
        response.data?.message || "Stock Opname berhasil diselesaikan",
      );

      await loadOpnames();
      await openDetail(selectedOpname.id);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal menyelesaikan Stock Opname",
      );
    } finally {
      setSaving(false);
    }
  };

  // Memformat tanggal sesi stock opname untuk tampilan.
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalDifference =
    selectedOpname?.items?.reduce(
      (total, item) => total + item.difference,
      0,
    ) || 0;

  const differenceCount =
    selectedOpname?.items?.filter((item) => item.difference !== 0).length || 0;

  return (
    <div className="stock-opname-page">
      <div className="stock-opname-header">
        <div>
          <p className="stock-opname-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>Stock Opname</h1>
          <p>Periksa dan sesuaikan stok fisik barang di setiap gudang.</p>
        </div>

        <button
          className="stock-opname-primary-btn"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          type="button"
        >
          + Create Stock Opname
        </button>
      </div>

      {error && (
        <div className="stock-opname-alert error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="stock-opname-alert success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {showForm && (
        <section className="stock-opname-form-panel">
          <div className="stock-opname-section-heading">
            <div>
              <h2>Create Stock Opname</h2>
              <p>Pilih gudang dan tanggal pemeriksaan stok.</p>
            </div>
            <button
              className="stock-opname-close-btn"
              onClick={() => setShowForm(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <form onSubmit={createOpname}>
            <div className="stock-opname-form-grid">
              <div className="stock-opname-field">
                <label>Warehouse *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouseCode} - {warehouse.warehouseName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stock-opname-field">
                <label>Opname Date *</label>
                <input
                  type="date"
                  value={opnameDate}
                  onChange={(e) => setOpnameDate(e.target.value)}
                  required
                />
              </div>

              <div className="stock-opname-field full">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pemeriksaan stok..."
                />
              </div>
            </div>

            <div className="stock-opname-form-actions">
              <button
                type="button"
                className="stock-opname-secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="stock-opname-primary-btn"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Create Opname"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="stock-opname-summary">
        <article className="stock-opname-summary-card">
          <span>Total Opname</span>
          <strong>{opnames.length}</strong>
          <small>Seluruh pemeriksaan</small>
        </article>

        <article className="stock-opname-summary-card">
          <span>Draft</span>
          <strong>
            {opnames.filter((item) => item.status === "DRAFT").length}
          </strong>
          <small>Menunggu penyelesaian</small>
        </article>

        <article className="stock-opname-summary-card">
          <span>Completed</span>
          <strong>
            {opnames.filter((item) => item.status === "COMPLETED").length}
          </strong>
          <small>Sudah diselesaikan</small>
        </article>
      </section>

      <section className="stock-opname-panel">
        <div className="stock-opname-section-heading">
          <div>
            <h2>Stock Opname History</h2>
            <p>Daftar pemeriksaan stok yang telah dibuat.</p>
          </div>

          <button
            className="stock-opname-refresh-btn"
            onClick={loadData}
            type="button"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="stock-opname-empty">Memuat data Stock Opname...</div>
        ) : opnames.length === 0 ? (
          <div className="stock-opname-empty">
            Belum ada data Stock Opname. Klik Create Stock Opname untuk memulai.
          </div>
        ) : (
          <div className="stock-opname-table-wrap">
            <table className="stock-opname-table">
              <thead>
                <tr>
                  <th>OPNAME NUMBER</th>
                  <th>WAREHOUSE</th>
                  <th>DATE</th>
                  <th>TOTAL ITEMS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {opnames.map((opname) => (
                  <tr key={opname.id}>
                    <td className="opname-number">{opname.opnameNumber}</td>
                    <td>{opname.warehouse?.warehouseName || "-"}</td>
                    <td>{formatDate(opname.opnameDate)}</td>
                    <td>{opname._count?.items ?? 0} barang</td>
                    <td>
                      <span
                        className={`opname-status ${opname.status.toLowerCase()}`}
                      >
                        {opname.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="opname-view-btn"
                        onClick={() => openDetail(opname.id)}
                        type="button"
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOpname && (
        <section className="stock-opname-panel stock-opname-detail">
          <div className="stock-opname-section-heading">
            <div>
              <p className="stock-opname-eyebrow">OPNAME DETAIL</p>
              <h2>{selectedOpname.opnameNumber}</h2>
              <p>
                {selectedOpname.warehouse?.warehouseName} ·{" "}
                {formatDate(selectedOpname.opnameDate)}
              </p>
            </div>

            <button
              className="stock-opname-secondary-btn"
              onClick={() => setSelectedOpname(null)}
              type="button"
            >
              Close Detail
            </button>
          </div>

          <div className="stock-opname-detail-stats">
            <div>
              <span>Total Barang</span>
              <strong>{selectedOpname.items?.length || 0}</strong>
            </div>
            <div>
              <span>Barang Berselisih</span>
              <strong>{differenceCount}</strong>
            </div>
            <div>
              <span>Total Selisih Bersih</span>
              <strong
                className={
                  totalDifference < 0
                    ? "difference-negative"
                    : totalDifference > 0
                      ? "difference-positive"
                      : ""
                }
              >
                {totalDifference > 0 ? "+" : ""}
                {totalDifference}
              </strong>
            </div>
          </div>

          {selectedOpname.notes && (
            <p className="stock-opname-notes">
              <strong>Notes:</strong> {selectedOpname.notes}
            </p>
          )}

          <div className="stock-opname-table-wrap">
            <table className="stock-opname-table detail-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>ITEM CODE</th>
                  <th>SYSTEM STOCK</th>
                  <th>PHYSICAL STOCK</th>
                  <th>DIFFERENCE</th>
                  {selectedOpname.status === "DRAFT" && <th>ACTION</th>}
                </tr>
              </thead>

              <tbody>
                {(selectedOpname.items || []).map((item) => {
                  const currentValue = physicalValues[item.id] ?? "";

                  const currentDifference =
                    currentValue.trim() === ""
                      ? null
                      : Number(currentValue) - item.systemStock;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.inventoryItem?.itemName}</strong>
                        <small>{item.inventoryItem?.unit}</small>
                      </td>
                      <td>{item.inventoryItem?.itemCode}</td>
                      <td>{item.systemStock}</td>
                      <td>
                        {selectedOpname.status === "DRAFT" ? (
                          <input
                            className="physical-stock-input"
                            type="number"
                            min="0"
                            step="1"
                            value={currentValue}
                            onChange={(e) =>
                              setPhysicalValues((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          item.physicalStock
                        )}
                      </td>
                      <td>
                        <span
                          className={`difference-value ${
                            (currentDifference ?? item.difference) < 0
                              ? "negative"
                              : (currentDifference ?? item.difference) > 0
                                ? "positive"
                                : "zero"
                          }`}
                        >
                          {(currentDifference ?? item.difference) > 0
                            ? "+"
                            : ""}
                          {currentDifference ?? item.difference}
                        </span>
                      </td>

                      {selectedOpname.status === "DRAFT" && (
                        <td>
                          <button
                            className="opname-save-btn"
                            type="button"
                            disabled={saving}
                            onClick={() => updatePhysicalStock(item)}
                          >
                            Save
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedOpname.status === "DRAFT" ? (
            <div className="stock-opname-complete-area">
              <p>
                Pastikan semua stok fisik sudah dihitung dan disimpan sebelum
                menyelesaikan opname.
              </p>

              <button
                className="stock-opname-complete-btn"
                type="button"
                disabled={saving}
                onClick={completeOpname}
              >
                {saving ? "Memproses..." : "Complete Stock Opname"}
              </button>
            </div>
          ) : (
            <div className="stock-opname-completed-info">
              Stock Opname ini sudah selesai. Data stok fisik tidak dapat diubah
              lagi.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

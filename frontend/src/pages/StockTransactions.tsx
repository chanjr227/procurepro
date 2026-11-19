import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/stock-transactions.css";

interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  unit: string;
  isActive: boolean;
}

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  isActive: boolean;
}

interface StockTransaction {
  id: number;
  transactionNumber: string;
  transactionType: "IN" | "OUT" | "ADJUSTMENT";
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  inventoryItem: InventoryItem;
  warehouse: Warehouse;
}

interface TransactionForm {
  inventoryItemId: string;
  warehouseId: string;
  transactionType: "IN" | "OUT" | "ADJUSTMENT";
  quantity: string;
  quantityChange: string;
  referenceNumber: string;
  notes: string;
}

const initialForm: TransactionForm = {
  inventoryItemId: "",
  warehouseId: "",
  transactionType: "IN",
  quantity: "",
  quantityChange: "",
  referenceNumber: "",
  notes: "",
};

// Menampilkan dan mencatat transaksi pergerakan stok.
const StockTransactions = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");

  // Memuat transaksi dan data pendukung formulir.
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [transactionRes, inventoryRes, warehouseRes] = await Promise.all([
        api.get("/stock-transactions"),
        api.get("/inventory"),
        api.get("/warehouses"),
      ]);

      setTransactions(transactionRes.data?.data || []);
      setInventoryItems(inventoryRes.data?.data || []);
      setWarehouses(warehouseRes.data?.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Gagal mengambil data stock transactions.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        transaction.transactionNumber.toLowerCase().includes(keyword) ||
        transaction.inventoryItem?.itemCode?.toLowerCase().includes(keyword) ||
        transaction.inventoryItem?.itemName?.toLowerCase().includes(keyword) ||
        transaction.warehouse?.warehouseName?.toLowerCase().includes(keyword) ||
        transaction.referenceNumber?.toLowerCase().includes(keyword);

      const matchesType =
        typeFilter === "ALL" || transaction.transactionType === typeFilter;

      const matchesWarehouse =
        warehouseFilter === "ALL" ||
        String(transaction.warehouse?.id) === warehouseFilter;

      return matchesSearch && matchesType && matchesWarehouse;
    });
  }, [transactions, search, typeFilter, warehouseFilter]);

  const totalIn = transactions
    .filter((item) => item.transactionType === "IN")
    .reduce((total, item) => total + Math.abs(item.quantityChange), 0);

  const totalOut = transactions
    .filter((item) => item.transactionType === "OUT")
    .reduce((total, item) => total + Math.abs(item.quantityChange), 0);

  const totalAdjustment = transactions.filter(
    (item) => item.transactionType === "ADJUSTMENT",
  ).length;

  // Memformat jumlah transaksi agar mudah dibaca.
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value || 0);

  // Memformat tanggal transaksi untuk tampilan.
  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Memperbarui nilai field pada formulir transaksi.
  const handleFormChange = (field: keyof TransactionForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // Mengosongkan formulir transaksi.
  const resetForm = () => {
    setForm(initialForm);
    setError("");
    setSuccess("");
  };

  // Mengirim transaksi stok baru untuk disimpan.
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const quantity = Number(form.quantity);
    const quantityChange = Number(form.quantityChange);

    if (!form.inventoryItemId || !form.warehouseId) {
      setError("Barang dan gudang wajib dipilih.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity harus berupa bilangan bulat positif.");
      return;
    }

    if (
      form.transactionType === "ADJUSTMENT" &&
      (!Number.isInteger(quantityChange) || quantityChange === 0)
    ) {
      setError("Quantity adjustment harus berupa angka bulat selain nol.");
      return;
    }

    const payload = {
      inventoryItemId: Number(form.inventoryItemId),
      warehouseId: Number(form.warehouseId),
      transactionType: form.transactionType,
      quantity,
      ...(form.transactionType === "ADJUSTMENT" ? { quantityChange } : {}),
      referenceNumber: form.referenceNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);

      const response = await api.post("/stock-transactions", payload);

      setSuccess(response.data?.message || "Transaksi stok berhasil dibuat.");

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal menyimpan transaksi stok.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Mengubah kode tipe transaksi menjadi label tampilan.
  const getTypeLabel = (type: string) => {
    if (type === "IN") return "Stock In";
    if (type === "OUT") return "Stock Out";
    return "Adjustment";
  };

  return (
    <div className="stock-transactions-page">
      <div className="st-header">
        <div>
          <h1>Stock Transactions</h1>
          <p>Kelola dan pantau seluruh pergerakan stok barang.</p>
        </div>

        <button
          className="st-primary-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + New Transaction
        </button>
      </div>

      {success && (
        <div className="st-alert success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {error && !showModal && (
        <div className="st-alert error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="st-summary-grid">
        <div className="st-summary-card">
          <div className="st-summary-icon green">↓</div>
          <div>
            <span>Total Stock In</span>
            <h2>{formatNumber(totalIn)}</h2>
            <small>Unit barang masuk</small>
          </div>
        </div>

        <div className="st-summary-card">
          <div className="st-summary-icon orange">↑</div>
          <div>
            <span>Total Stock Out</span>
            <h2>{formatNumber(totalOut)}</h2>
            <small>Unit barang keluar</small>
          </div>
        </div>

        <div className="st-summary-card">
          <div className="st-summary-icon blue">↔</div>
          <div>
            <span>Adjustments</span>
            <h2>{formatNumber(totalAdjustment)}</h2>
            <small>Jumlah transaksi koreksi</small>
          </div>
        </div>
      </div>

      <div className="st-content-card">
        <div className="st-content-heading">
          <div>
            <h2>Transaction History</h2>
            <p>Daftar riwayat transaksi persediaan barang.</p>
          </div>
        </div>

        <div className="st-toolbar">
          <div className="st-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor transaksi, barang, gudang..."
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Semua Tipe</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="ALL">Semua Gudang</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.warehouseName}
              </option>
            ))}
          </select>

          <button
            className="st-refresh-btn"
            onClick={loadData}
            disabled={loading}
          >
            ↻
          </button>
        </div>

        {loading ? (
          <div className="st-empty">Memuat riwayat transaksi...</div>
        ) : (
          <div className="st-table-wrapper">
            <table className="st-table">
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>DATE</th>
                  <th>ITEM</th>
                  <th>WAREHOUSE</th>
                  <th>TYPE</th>
                  <th>QUANTITY</th>
                  <th>STOCK BEFORE</th>
                  <th>STOCK AFTER</th>
                  <th>REFERENCE</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => {
                    const item = transaction.inventoryItem;
                    const isPositive = transaction.quantityChange > 0;

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <strong className="st-transaction-number">
                            {transaction.transactionNumber}
                          </strong>
                        </td>

                        <td>{formatDate(transaction.createdAt)}</td>

                        <td>
                          <div className="st-item-cell">
                            <strong>{item?.itemName || "-"}</strong>
                            <small>{item?.itemCode || "-"}</small>
                          </div>
                        </td>

                        <td>{transaction.warehouse?.warehouseName || "-"}</td>

                        <td>
                          <span
                            className={`st-type-badge ${transaction.transactionType.toLowerCase()}`}
                          >
                            {getTypeLabel(transaction.transactionType)}
                          </span>
                        </td>

                        <td>
                          <strong
                            className={
                              isPositive ? "st-positive" : "st-negative"
                            }
                          >
                            {isPositive ? "+" : ""}
                            {formatNumber(transaction.quantityChange)}{" "}
                            {item?.unit || ""}
                          </strong>
                        </td>

                        <td>{formatNumber(transaction.stockBefore)}</td>

                        <td>
                          <strong>
                            {formatNumber(transaction.stockAfter)}
                          </strong>
                        </td>

                        <td>
                          <span className="st-reference">
                            {transaction.referenceNumber || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="st-empty">
                      Tidak ada transaksi yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="st-footer">
          Menampilkan {filteredTransactions.length} transaksi
        </div>
      </div>

      {showModal && (
        <div className="st-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="st-modal" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <div>
                <h2>Create Stock Transaction</h2>
                <p>Masukkan informasi pergerakan stok barang.</p>
              </div>

              <button
                type="button"
                className="st-close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {error && <div className="st-alert error">{error}</div>}

              <div className="st-form-group">
                <label>Transaction Type *</label>
                <select
                  value={form.transactionType}
                  onChange={(e) => {
                    handleFormChange("transactionType", e.target.value);
                    handleFormChange("quantityChange", "");
                  }}
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>

              <div className="st-form-group">
                <label>Inventory Item *</label>
                <select
                  required
                  value={form.inventoryItemId}
                  onChange={(e) =>
                    handleFormChange("inventoryItemId", e.target.value)
                  }
                >
                  <option value="">Pilih Barang</option>
                  {inventoryItems
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemCode} - {item.itemName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="st-form-group">
                <label>Warehouse *</label>
                <select
                  required
                  value={form.warehouseId}
                  onChange={(e) =>
                    handleFormChange("warehouseId", e.target.value)
                  }
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses
                    .filter((warehouse) => warehouse.isActive)
                    .map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseCode} - {warehouse.warehouseName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="st-form-group">
                <label>
                  {form.transactionType === "ADJUSTMENT"
                    ? "Quantity (isi angka positif) *"
                    : "Quantity *"}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.quantity}
                  onChange={(e) => handleFormChange("quantity", e.target.value)}
                  placeholder="Contoh: 10"
                />
              </div>

              {form.transactionType === "ADJUSTMENT" && (
                <div className="st-form-group">
                  <label>Quantity Change *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={form.quantityChange}
                    onChange={(e) =>
                      handleFormChange("quantityChange", e.target.value)
                    }
                    placeholder="Contoh: 5 atau -3"
                  />
                  <small>
                    Angka positif menambah stok, angka negatif mengurangi stok.
                  </small>
                </div>
              )}

              <div className="st-form-group">
                <label>Reference Number</label>
                <input
                  value={form.referenceNumber}
                  onChange={(e) =>
                    handleFormChange("referenceNumber", e.target.value)
                  }
                  placeholder="Contoh: REF-2026-001"
                />
              </div>

              <div className="st-form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Keterangan transaksi..."
                />
              </div>

              <div className="st-modal-actions">
                <button
                  type="button"
                  className="st-cancel-btn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="st-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransactions;

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

import api from "../services/api";
import "../css/purchase-orders.css";
import "../css/goods-receipts.css";

type ReceiptStatus = "PARTIAL" | "COMPLETED";

interface Vendor {
  id: number;
  companyName: string;
  vendorCode?: string;
}

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  isActive: boolean;
}

interface POItem {
  id: number;
  itemName: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | string;
  totalPrice: number | string;
  quantityReceivedBefore: number;
  remainingQuantity: number;
}

interface PurchaseOrderOption {
  id: number;
  poNumber: string;
  status: string;
  orderDate: string;
  deliveryDate?: string | null;
  vendor: Vendor;
  items: POItem[];
}

interface ReceiptItem {
  id: number;
  purchaseOrderItemId: number;
  quantityReceived: number;
  quantityDamaged: number;
  notes?: string | null;
  purchaseOrderItem: POItem;
}

interface GoodsReceipt {
  id: number;
  receiptNumber: string;
  purchaseOrderId: number;
  receivedDate: string;
  receivedBy: string;
  notes?: string | null;
  status: ReceiptStatus;
  warehouse?: Warehouse | null;
  purchaseOrder: {
    id: number;
    poNumber: string;
    vendor: Vendor;
    items: POItem[];
  };
  items: ReceiptItem[];
  createdAt: string;
}

interface ReceiptFormItem {
  purchaseOrderItemId: number;
  itemName: string;
  orderedQuantity: number;
  remainingQuantity: number;
  unit: string;
  quantityReceived: string;
  quantityDamaged: string;
  notes: string;
}

const statusLabels: Record<ReceiptStatus, string> = {
  PARTIAL: "Partial",
  COMPLETED: "Completed",
};

// Memformat tanggal penerimaan untuk tampilan.
const formatDate = (date?: string | null) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Memformat jumlah numerik agar mudah dibaca.
const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

// Mengambil pesan yang sesuai dari error API atau fallback.
const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "Terjadi kesalahan saat menghubungi server."
    );
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
};

// Menampilkan dan mengelola penerimaan barang.
export default function GoodsReceipt() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>(
    [],
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    purchaseOrderId: "",
    warehouseId: "",
    receivedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [formItems, setFormItems] = useState<ReceiptFormItem[]>([]);

  // =====================================
  // LOAD GOODS RECEIPTS
  // =====================================

  // Memuat daftar penerimaan barang dari backend.
  const loadReceipts = async () => {
    try {
      setLoading(true);

      const params: Record<string, string> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const response = await api.get("/goods-receipts", {
        params,
      });

      setReceipts(response.data.data || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // LOAD PURCHASE ORDER + WAREHOUSE
  // =====================================

  // Memuat purchase order yang tersedia untuk diterima.
  const loadPurchaseOrders = async () => {
    try {
      setLoadingOptions(true);

      const response = await api.get("/goods-receipts/options");

      setPurchaseOrders(response.data.data || []);
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadReceipts();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search, statusFilter]);

  // =====================================
  // SUMMARY
  // =====================================

  const totalReceipts = receipts.length;

  const partialCount = receipts.filter(
    (receipt) => receipt.status === "PARTIAL",
  ).length;

  const completedCount = receipts.filter(
    (receipt) => receipt.status === "COMPLETED",
  ).length;

  const totalReceived = receipts.reduce(
    (total, receipt) =>
      total +
      receipt.items.reduce(
        (itemTotal, item) => itemTotal + item.quantityReceived,
        0,
      ),
    0,
  );

  // =====================================
  // SELECT PURCHASE ORDER
  // =====================================

  // Memperbarui pilihan purchase order dan data terkait pada formulir.
  const handlePurchaseOrderChange = (purchaseOrderId: string) => {
    setForm((previous) => ({
      ...previous,
      purchaseOrderId,
    }));

    const selectedPO = purchaseOrders.find(
      (po) => po.id === Number(purchaseOrderId),
    );

    if (!selectedPO) {
      setFormItems([]);
      return;
    }

    setFormItems(
      selectedPO.items.map((item) => ({
        purchaseOrderItemId: item.id,
        itemName: item.itemName,
        orderedQuantity: item.quantity,
        remainingQuantity: item.remainingQuantity,
        unit: item.unit,
        quantityReceived: "",
        quantityDamaged: "",
        notes: "",
      })),
    );
  };

  // =====================================
  // UPDATE RECEIPT ITEM
  // =====================================

  const updateReceiptItem = (
    index: number,
    field: "quantityReceived" | "quantityDamaged" | "notes",
    value: string,
  ) => {
    setFormItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  // =====================================
  // VALIDATION
  // =====================================

  const validationMessage = useMemo(() => {
    if (!form.purchaseOrderId) {
      return "Pilih Purchase Order terlebih dahulu.";
    }

    if (!form.warehouseId) {
      return "Pilih gudang terlebih dahulu.";
    }

    if (!form.receivedDate) {
      return "Tanggal penerimaan wajib diisi.";
    }

    if (warehouses.length === 0) {
      return "Belum ada gudang aktif. Tambahkan gudang terlebih dahulu.";
    }

    const filledItems = formItems.filter(
      (item) => item.quantityReceived !== "" || item.quantityDamaged !== "",
    );

    if (filledItems.length === 0) {
      return "Isi jumlah barang diterima atau rusak minimal satu item.";
    }

    for (const item of filledItems) {
      const received = Number(item.quantityReceived || 0);
      const damaged = Number(item.quantityDamaged || 0);

      if (
        !Number.isInteger(received) ||
        !Number.isInteger(damaged) ||
        received < 0 ||
        damaged < 0
      ) {
        return `Jumlah ${item.itemName} harus berupa bilangan bulat minimal 0.`;
      }

      if (received + damaged <= 0) {
        return `Isi jumlah barang ${item.itemName}.`;
      }

      if (received + damaged > item.remainingQuantity) {
        return `Jumlah diterima dan rusak untuk ${item.itemName} melebihi sisa pesanan (${item.remainingQuantity}).`;
      }
    }

    return "";
  }, [
    form.purchaseOrderId,
    form.warehouseId,
    form.receivedDate,
    formItems,
    warehouses.length,
  ]);

  // =====================================
  // RESET FORM
  // =====================================

  // Mengosongkan formulir penerimaan barang.
  const resetForm = () => {
    setForm({
      purchaseOrderId: "",
      warehouseId: "",
      receivedDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    setFormItems([]);
    setShowForm(false);
  };

  // =====================================
  // CREATE GOODS RECEIPT
  // =====================================

  // Mengirim data penerimaan barang untuk disimpan.
  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const items = formItems
      .filter(
        (item) =>
          Number(item.quantityReceived || 0) > 0 ||
          Number(item.quantityDamaged || 0) > 0,
      )
      .map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantityReceived: Number(item.quantityReceived || 0),
        quantityDamaged: Number(item.quantityDamaged || 0),
        notes: item.notes,
      }));

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.post("/goods-receipts", {
        purchaseOrderId: Number(form.purchaseOrderId),
        warehouseId: Number(form.warehouseId),
        receivedDate: form.receivedDate,
        notes: form.notes,
        items,
      });

      setSuccessMessage(
        "Goods Receipt berhasil dibuat dan stok gudang berhasil diperbarui.",
      );

      resetForm();

      await Promise.all([loadReceipts(), loadPurchaseOrders()]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // VIEW DETAIL
  // =====================================

  // Memuat dan menampilkan detail penerimaan barang.
  const handleViewDetail = async (id: number) => {
    try {
      setErrorMessage("");

      const response = await api.get(`/goods-receipts/${id}`);

      setSelectedReceipt(response.data.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="po-page gr-page">
      {/* HEADER */}
      <div className="po-header">
        <div>
          <span className="po-eyebrow">PROCUREMENT MANAGEMENT</span>

          <h1>Goods Receipt</h1>

          <p>
            Kelola penerimaan barang berdasarkan Purchase Order dari vendor.
          </p>
        </div>

        <button
          className="po-primary-button"
          type="button"
          onClick={() => {
            setErrorMessage("");
            setSuccessMessage("");
            setShowForm(true);
            loadPurchaseOrders();
          }}
        >
          + Create Goods Receipt
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="po-alert po-alert-error">
          {errorMessage}

          <button type="button" onClick={() => setErrorMessage("")}>
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="po-alert po-alert-success">
          {successMessage}

          <button type="button" onClick={() => setSuccessMessage("")}>
            ×
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="po-stats">
        <div className="po-stat-card">
          <span>Total Goods Receipt</span>
          <strong>{totalReceipts}</strong>
          <small>Data penerimaan yang ditampilkan</small>
        </div>

        <div className="po-stat-card">
          <span>Partial Receipts</span>
          <strong>{partialCount}</strong>
          <small>Penerimaan belum lengkap</small>
        </div>

        <div className="po-stat-card">
          <span>Completed Receipts</span>
          <strong>{completedCount}</strong>
          <small>Penerimaan selesai</small>
        </div>

        <div className="po-stat-card">
          <span>Items Received</span>
          <strong>{formatNumber(totalReceived)}</strong>
          <small>Total barang diterima dalam data tampil</small>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <div className="po-form-card">
          <div className="po-section-heading">
            <div>
              <h2>Create Goods Receipt</h2>
              <p>
                Pilih Purchase Order, gudang, dan jumlah barang yang diterima.
              </p>
            </div>

            <button
              className="po-close-button"
              type="button"
              onClick={resetForm}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className="po-form-grid">
              {/* PURCHASE ORDER */}
              <label>
                Purchase Order
                <select
                  value={form.purchaseOrderId}
                  onChange={(event) =>
                    handlePurchaseOrderChange(event.target.value)
                  }
                  required
                  disabled={loadingOptions}
                >
                  <option value="">Pilih Purchase Order</option>

                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} - {po.vendor?.companyName || "Vendor"}
                    </option>
                  ))}
                </select>
                {loadingOptions && (
                  <small>Memuat pilihan Purchase Order...</small>
                )}
                {!loadingOptions && purchaseOrders.length === 0 && (
                  <small>
                    Tidak ada Purchase Order berstatus SENT yang masih memiliki
                    barang tersisa.
                  </small>
                )}
              </label>

              {/* WAREHOUSE */}
              <label>
                Gudang
                <select
                  value={form.warehouseId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      warehouseId: event.target.value,
                    }))
                  }
                  required
                  disabled={loadingOptions || warehouses.length === 0}
                >
                  <option value="">
                    {loadingOptions ? "Memuat gudang..." : "Pilih Gudang"}
                  </option>

                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouseCode
                        ? `${warehouse.warehouseCode} - `
                        : ""}
                      {warehouse.warehouseName}
                    </option>
                  ))}
                </select>
                {!loadingOptions && warehouses.length === 0 && (
                  <small>
                    Belum ada gudang aktif. Tambahkan gudang melalui menu
                    Warehouse.
                  </small>
                )}
              </label>

              {/* RECEIVED DATE */}
              <label>
                Received Date
                <input
                  type="date"
                  value={form.receivedDate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      receivedDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {/* NOTES */}
              <label>
                Notes
                <input
                  type="text"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Catatan penerimaan barang"
                />
              </label>
            </div>

            {/* SELECTED PO ITEMS */}
            {formItems.length > 0 && (
              <div className="po-items-section">
                <div className="po-section-heading">
                  <div>
                    <h2>Goods Receipt Items</h2>
                    <p>
                      Masukkan kuantitas yang diterima dan kuantitas yang rusak.
                    </p>
                  </div>
                </div>

                <div className="po-table-wrapper">
                  <table className="po-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>ORDERED</th>
                        <th>REMAINING</th>
                        <th>RECEIVED</th>
                        <th>DAMAGED</th>
                        <th>UNIT</th>
                      </tr>
                    </thead>

                    <tbody>
                      {formItems.map((item, index) => (
                        <tr key={item.purchaseOrderItemId}>
                          <td className="po-number">{item.itemName}</td>

                          <td>{formatNumber(item.orderedQuantity)}</td>

                          <td>
                            <strong>
                              {formatNumber(item.remainingQuantity)}
                            </strong>
                          </td>

                          <td>
                            <input
                              className="gr-quantity-input"
                              type="number"
                              min="0"
                              max={item.remainingQuantity}
                              step="1"
                              value={item.quantityReceived}
                              onChange={(event) =>
                                updateReceiptItem(
                                  index,
                                  "quantityReceived",
                                  event.target.value,
                                )
                              }
                              placeholder="0"
                            />
                          </td>

                          <td>
                            <input
                              className="gr-quantity-input"
                              type="number"
                              min="0"
                              max={item.remainingQuantity}
                              step="1"
                              value={item.quantityDamaged}
                              onChange={(event) =>
                                updateReceiptItem(
                                  index,
                                  "quantityDamaged",
                                  event.target.value,
                                )
                              }
                              placeholder="0"
                            />
                          </td>

                          <td>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ITEM NOTES */}
                <div className="gr-item-notes">
                  <h3>Item Notes</h3>

                  {formItems.map((item, index) => (
                    <label key={item.purchaseOrderItemId}>
                      {item.itemName}

                      <input
                        type="text"
                        value={item.notes}
                        onChange={(event) =>
                          updateReceiptItem(index, "notes", event.target.value)
                        }
                        placeholder="Contoh: kondisi barang atau catatan inspeksi"
                      />
                    </label>
                  ))}
                </div>

                <div className="gr-form-info">
                  <strong>Informasi:</strong>

                  <span>
                    Jumlah diterima + jumlah rusak tidak boleh melebihi sisa
                    kuantitas Purchase Order. Barang rusak tidak akan menambah
                    stok Inventory.
                  </span>
                </div>
              </div>
            )}

            {/* FORM ACTIONS */}
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
                disabled={
                  saving ||
                  loadingOptions ||
                  !formItems.length ||
                  warehouses.length === 0 ||
                  Boolean(validationMessage)
                }
                title={validationMessage || "Simpan Goods Receipt"}
              >
                {saving ? "Saving..." : "Save Goods Receipt"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GOODS RECEIPT LIST */}
      <div className="po-table-card">
        <div className="po-section-heading">
          <div>
            <h2>Goods Receipt List</h2>
            <p>Daftar seluruh transaksi penerimaan barang.</p>
          </div>
        </div>

        <div className="po-toolbar">
          <input
            type="search"
            placeholder="Search receipt number, PO, or vendor..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PARTIAL">Partial</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="po-table-wrapper">
          <table className="po-table">
            <thead>
              <tr>
                <th>RECEIPT NUMBER</th>
                <th>PURCHASE ORDER</th>
                <th>VENDOR</th>
                <th>RECEIVED DATE</th>
                <th>TOTAL RECEIVED</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="po-empty">
                    Loading Goods Receipts...
                  </td>
                </tr>
              ) : receipts.length > 0 ? (
                receipts.map((receipt) => {
                  const receivedQuantity = receipt.items.reduce(
                    (total, item) => total + item.quantityReceived,
                    0,
                  );

                  return (
                    <tr key={receipt.id}>
                      <td className="po-number">{receipt.receiptNumber}</td>

                      <td>{receipt.purchaseOrder?.poNumber || "-"}</td>

                      <td>
                        {receipt.purchaseOrder?.vendor?.companyName || "-"}
                      </td>

                      <td>{formatDate(receipt.receivedDate)}</td>

                      <td className="po-amount">
                        {formatNumber(receivedQuantity)}
                      </td>

                      <td>
                        <span
                          className={`gr-status ${receipt.status.toLowerCase()}`}
                        >
                          {statusLabels[receipt.status]}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="po-secondary-button"
                          onClick={() => handleViewDetail(receipt.id)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="po-empty">
                    Tidak ada Goods Receipt ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="po-table-footer">
          Menampilkan {receipts.length} Goods Receipts
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedReceipt && (
        <div className="po-modal-overlay">
          <div className="po-detail-modal">
            <div className="po-section-heading">
              <div>
                <h2>Goods Receipt Detail</h2>
                <p>{selectedReceipt.receiptNumber}</p>
              </div>

              <button
                className="po-close-button"
                type="button"
                onClick={() => setSelectedReceipt(null)}
              >
                ×
              </button>
            </div>

            <div className="po-detail-grid">
              <div>
                <small>Receipt Number</small>
                <strong>{selectedReceipt.receiptNumber}</strong>
              </div>

              <div>
                <small>Purchase Order</small>
                <strong>
                  {selectedReceipt.purchaseOrder?.poNumber || "-"}
                </strong>
              </div>

              <div>
                <small>Vendor</small>
                <strong>
                  {selectedReceipt.purchaseOrder?.vendor?.companyName || "-"}
                </strong>
              </div>

              <div>
                <small>Warehouse</small>
                <strong>
                  {selectedReceipt.warehouse?.warehouseName || "-"}
                </strong>
              </div>

              <div>
                <small>Received Date</small>
                <strong>{formatDate(selectedReceipt.receivedDate)}</strong>
              </div>

              <div>
                <small>Received By</small>
                <strong>{selectedReceipt.receivedBy || "-"}</strong>
              </div>

              <div>
                <small>Status</small>
                <strong>{statusLabels[selectedReceipt.status]}</strong>
              </div>
            </div>

            <h3>Received Items</h3>

            <div className="po-table-wrapper">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>ORDERED</th>
                    <th>RECEIVED</th>
                    <th>DAMAGED</th>
                    <th>UNIT</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedReceipt.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.purchaseOrderItem?.itemName || "-"}</td>

                      <td>
                        {formatNumber(item.purchaseOrderItem?.quantity || 0)}
                      </td>

                      <td>{formatNumber(item.quantityReceived)}</td>

                      <td>{formatNumber(item.quantityDamaged)}</td>

                      <td>{item.purchaseOrderItem?.unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReceipt.notes && (
              <p className="gr-detail-notes">
                <strong>Notes:</strong> {selectedReceipt.notes}
              </p>
            )}

            <div className="po-form-actions">
              <button
                className="po-primary-button"
                type="button"
                onClick={() => setSelectedReceipt(null)}
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

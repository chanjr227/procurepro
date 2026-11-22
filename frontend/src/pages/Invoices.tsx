import { useEffect, useMemo, useState, type FormEvent } from "react";
import api from "../services/api";
import "../css/invoices.css";

type InvoiceStatus = "DRAFT" | "PENDING" | "VERIFIED" | "REJECTED" | "PAID";

interface InvoiceItem {
  id: number;
  purchaseOrderItemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number | string;
  totalPrice: number | string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  vendorInvoiceNumber?: string;
  vendorId: number;
  vendor?: { companyName?: string };
  purchaseOrderId: number;
  purchaseOrder?: { poNumber?: string; orderNumber?: string };
  invoiceDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  subtotal: number | string;
  tax: number | string;
  totalAmount: number | string;
  notes?: string;
  rejectionReason?: string;
  items?: InvoiceItem[];
}

interface POItem {
  id: number;
  itemName?: string;
  inventoryItem?: { itemName?: string; itemCode?: string };
  quantity: number;
  remainingQuantity?: number;
  receivedQuantity?: number;
  unit?: string;
  unitPrice: number | string;
}

interface POOption {
  id: number;
  poNumber?: string;
  orderNumber?: string;
  vendor?: { companyName?: string };
  items: POItem[];
}

const money = (value: number | string | undefined) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const dateFormat = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getErrorMessage = (error: any) =>
  error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";

const unwrapArray = (response: any): any[] => {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.purchaseOrders)) return data.purchaseOrders;
  return [];
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [poOptions, setPoOptions] = useState<POOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [matching, setMatching] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    purchaseOrderId: "",
    vendorInvoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    tax: "0",
    notes: "",
  });

  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, optionsResponse] = await Promise.all([
        api.get("/invoices"),
        api.get("/invoices/options"),
      ]);

      setInvoices(unwrapArray(invoiceResponse));
      setPoOptions(unwrapArray(optionsResponse));
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const keyword = search.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(keyword) ||
        (invoice.vendor?.companyName || "").toLowerCase().includes(keyword) ||
        (invoice.vendorInvoiceNumber || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const selectedPO = poOptions.find(
    (po) => String(po.id) === form.purchaseOrderId,
  );

  const selectedItems = selectedPO?.items || [];

  const subtotal = selectedItems.reduce((total, item) => {
    const quantity = Number(quantities[item.id] || 0);
    return total + quantity * Number(item.unitPrice || 0);
  }, 0);

  const taxAmount = Number(form.tax || 0);
  const totalAmount = subtotal + taxAmount;

  const summary = {
    total: invoices.length,
    pending: invoices.filter((item) => item.status === "PENDING").length,
    verified: invoices.filter((item) => item.status === "VERIFIED").length,
    paid: invoices.filter((item) => item.status === "PAID").length,
  };

  const resetForm = () => {
    setForm({
      purchaseOrderId: "",
      vendorInvoiceNumber: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      tax: "0",
      notes: "",
    });
    setQuantities({});
    setShowForm(false);
  };

  const handlePOChange = (value: string) => {
    setForm((previous) => ({ ...previous, purchaseOrderId: value }));
    setQuantities({});
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const items = selectedItems
      .filter((item) => Number(quantities[item.id] || 0) > 0)
      .map((item) => ({
        purchaseOrderItemId: item.id,
        quantity: Number(quantities[item.id]),
        unitPrice: Number(item.unitPrice),
      }));

    if (!form.purchaseOrderId) {
      setMessage("Silakan pilih Purchase Order.");
      return;
    }

    if (items.length === 0) {
      setMessage("Masukkan minimal satu jumlah barang yang ditagihkan.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await api.post("/invoices", {
        purchaseOrderId: Number(form.purchaseOrderId),
        vendorInvoiceNumber: form.vendorInvoiceNumber || undefined,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || undefined,
        tax: Number(form.tax || 0),
        notes: form.notes || undefined,
        items,
      });

      setMessage("Invoice berhasil dibuat.");
      resetForm();
      await loadData();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (invoice: Invoice) => {
    try {
      setSelectedInvoice(invoice);
      setMatching(null);
      const response = await api.get(`/invoices/${invoice.id}`);
      const data = response.data?.data ?? response.data;
      setSelectedInvoice(data);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const openMatching = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/matching`);
      setMatching(response.data?.data ?? response.data);
      setSelectedInvoice(invoice);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const handleAction = async (
    invoice: Invoice,
    action: "verify" | "pay" | "reject",
  ) => {
    try {
      setMessage("");

      if (action === "reject") {
        if (!rejectReason.trim()) {
          setMessage("Alasan penolakan wajib diisi.");
          return;
        }

        await api.patch(`/invoices/${invoice.id}/reject`, {
          rejectionReason: rejectReason,
        });
        setShowReject(false);
        setRejectReason("");
      } else {
        await api.patch(`/invoices/${invoice.id}/${action}`);
      }

      setMessage(
        action === "verify"
          ? "Invoice berhasil diverifikasi."
          : action === "pay"
            ? "Invoice berhasil ditandai lunas."
            : "Invoice berhasil ditolak.",
      );

      setSelectedInvoice(null);
      setMatching(null);
      await loadData();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const statusLabel: Record<InvoiceStatus, string> = {
    DRAFT: "Draft",
    PENDING: "Menunggu Verifikasi",
    VERIFIED: "Terverifikasi",
    REJECTED: "Ditolak",
    PAID: "Lunas",
  };

  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <div>
          <h1>Invoice Management</h1>
          <p>Kelola tagihan vendor dan proses pembayaran pengadaan.</p>
        </div>
        <button
          className="invoice-primary-button"
          onClick={() => setShowForm(true)}
        >
          + Buat Invoice
        </button>
      </div>

      {message && (
        <div className="invoice-message">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <div className="invoice-stats">
        <div className="invoice-stat-card">
          <span>Total Invoice</span>
          <strong>{summary.total}</strong>
          <small>Seluruh invoice</small>
        </div>
        <div className="invoice-stat-card">
          <span>Menunggu Verifikasi</span>
          <strong>{summary.pending}</strong>
          <small>Perlu diperiksa</small>
        </div>
        <div className="invoice-stat-card">
          <span>Terverifikasi</span>
          <strong>{summary.verified}</strong>
          <small>Siap dibayar</small>
        </div>
        <div className="invoice-stat-card">
          <span>Lunas</span>
          <strong>{summary.paid}</strong>
          <small>Pembayaran selesai</small>
        </div>
      </div>

      <div className="invoice-table-card">
        <div className="invoice-toolbar">
          <div>
            <h2>Daftar Invoice</h2>
            <p>Daftar tagihan dari Purchase Order.</p>
          </div>
          <div className="invoice-filters">
            <input
              type="text"
              placeholder="Cari nomor invoice atau vendor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Menunggu Verifikasi</option>
              <option value="VERIFIED">Terverifikasi</option>
              <option value="REJECTED">Ditolak</option>
              <option value="PAID">Lunas</option>
            </select>
            <button className="invoice-refresh-button" onClick={loadData}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="invoice-empty">Memuat data invoice...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="invoice-empty">Belum ada data invoice.</div>
        ) : (
          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Nomor Invoice</th>
                  <th>Vendor</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoiceNumber}</strong>
                      <small>{invoice.vendorInvoiceNumber || "-"}</small>
                    </td>
                    <td>{invoice.vendor?.companyName || "-"}</td>
                    <td>{dateFormat(invoice.invoiceDate)}</td>
                    <td>{dateFormat(invoice.dueDate)}</td>
                    <td>{money(invoice.totalAmount)}</td>
                    <td>
                      <span
                        className={`invoice-status ${invoice.status.toLowerCase()}`}
                      >
                        {statusLabel[invoice.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="invoice-action-button"
                        onClick={() => openDetail(invoice)}
                      >
                        Detail
                      </button>
                      <button
                        className="invoice-action-button"
                        onClick={() => openMatching(invoice)}
                      >
                        Matching
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="invoice-modal-overlay">
          <form className="invoice-modal" onSubmit={handleCreate}>
            <div className="invoice-modal-header">
              <div>
                <h2>Buat Invoice</h2>
                <p>Masukkan informasi tagihan dari vendor.</p>
              </div>
              <button type="button" onClick={resetForm}>
                ×
              </button>
            </div>

            <div className="invoice-form-grid">
              <label>
                Purchase Order *
                <select
                  required
                  value={form.purchaseOrderId}
                  onChange={(event) => handlePOChange(event.target.value)}
                >
                  <option value="">Pilih Purchase Order</option>
                  {poOptions.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber || po.orderNumber || `PO #${po.id}`} -{" "}
                      {po.vendor?.companyName || "Vendor"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nomor Invoice Vendor
                <input
                  value={form.vendorInvoiceNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vendorInvoiceNumber: event.target.value,
                    })
                  }
                  placeholder="Contoh: INV-VENDOR-001"
                />
              </label>

              <label>
                Tanggal Invoice *
                <input
                  type="date"
                  required
                  value={form.invoiceDate}
                  onChange={(event) =>
                    setForm({ ...form, invoiceDate: event.target.value })
                  }
                />
              </label>

              <label>
                Jatuh Tempo
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm({ ...form, dueDate: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="invoice-form-section">
              <h3>Barang yang Ditagihkan</h3>
              {!selectedPO ? (
                <p className="invoice-hint">
                  Pilih Purchase Order terlebih dahulu.
                </p>
              ) : selectedItems.length === 0 ? (
                <p className="invoice-hint">
                  Tidak ada barang yang dapat ditagihkan.
                </p>
              ) : (
                <div className="invoice-item-list">
                  {selectedItems.map((item) => {
                    const remaining = item.remainingQuantity ?? item.quantity;

                    return (
                      <div className="invoice-item-row" key={item.id}>
                        <div>
                          <strong>
                            {item.itemName ||
                              item.inventoryItem?.itemName ||
                              `Item #${item.id}`}
                          </strong>
                          <small>
                            Maksimal: {remaining} {item.unit || ""}
                            {" · "}
                            {money(item.unitPrice)}
                          </small>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          placeholder="Qty"
                          value={quantities[item.id] || ""}
                          onChange={(event) =>
                            setQuantities({
                              ...quantities,
                              [item.id]: event.target.value,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="invoice-form-grid">
              <label>
                Pajak (Rp)
                <input
                  type="number"
                  min="0"
                  value={form.tax}
                  onChange={(event) =>
                    setForm({ ...form, tax: event.target.value })
                  }
                />
              </label>
              <label>
                Catatan
                <input
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Catatan invoice (opsional)"
                />
              </label>
            </div>

            <div className="invoice-total-box">
              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div>
                <span>Pajak</span>
                <strong>{money(taxAmount)}</strong>
              </div>
              <div className="invoice-grand-total">
                <span>Total Invoice</span>
                <strong>{money(totalAmount)}</strong>
              </div>
            </div>

            <div className="invoice-modal-actions">
              <button
                type="button"
                className="invoice-secondary-button"
                onClick={resetForm}
              >
                Batal
              </button>
              <button
                type="submit"
                className="invoice-primary-button"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan Invoice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedInvoice && (
        <div className="invoice-modal-overlay">
          <div className="invoice-modal invoice-detail-modal">
            <div className="invoice-modal-header">
              <div>
                <h2>{selectedInvoice.invoiceNumber}</h2>
                <p>Detail invoice dan tindakan.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setMatching(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="invoice-detail-grid">
              <div>
                <span>Vendor</span>
                <strong>{selectedInvoice.vendor?.companyName || "-"}</strong>
              </div>
              <div>
                <span>Tanggal Invoice</span>
                <strong>{dateFormat(selectedInvoice.invoiceDate)}</strong>
              </div>
              <div>
                <span>Jatuh Tempo</span>
                <strong>{dateFormat(selectedInvoice.dueDate)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{statusLabel[selectedInvoice.status]}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{money(selectedInvoice.subtotal)}</strong>
              </div>
              <div>
                <span>Pajak</span>
                <strong>{money(selectedInvoice.tax)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(selectedInvoice.totalAmount)}</strong>
              </div>
            </div>

            {selectedInvoice.items && (
              <>
                <h3>Rincian Barang</h3>
                <div className="invoice-table-wrap">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Barang</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.itemName}</td>
                          <td>
                            {item.quantity} {item.unit}
                          </td>
                          <td>{money(item.unitPrice)}</td>
                          <td>{money(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selectedInvoice.rejectionReason && (
              <p className="invoice-rejection-reason">
                Alasan penolakan: {selectedInvoice.rejectionReason}
              </p>
            )}

            {matching && (
              <div className="invoice-matching-box">
                <h3>Hasil Invoice Matching</h3>
                <pre>{JSON.stringify(matching, null, 2)}</pre>
              </div>
            )}

            {selectedInvoice.status === "PENDING" && (
              <div className="invoice-detail-actions">
                <button
                  className="invoice-danger-button"
                  onClick={() => setShowReject(true)}
                >
                  Tolak
                </button>
                <button
                  className="invoice-primary-button"
                  onClick={() => handleAction(selectedInvoice, "verify")}
                >
                  Verifikasi
                </button>
              </div>
            )}

            {selectedInvoice.status === "VERIFIED" && (
              <div className="invoice-detail-actions">
                <button
                  className="invoice-primary-button"
                  onClick={() => handleAction(selectedInvoice, "pay")}
                >
                  Tandai Lunas
                </button>
              </div>
            )}

            {showReject && (
              <div className="invoice-reject-form">
                <label>
                  Alasan Penolakan
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Tuliskan alasan penolakan..."
                  />
                </label>
                <button
                  className="invoice-danger-button"
                  onClick={() => handleAction(selectedInvoice, "reject")}
                >
                  Konfirmasi Penolakan
                </button>
                <button
                  className="invoice-secondary-button"
                  onClick={() => setShowReject(false)}
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

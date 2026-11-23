import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/reports.css";

type ReportData = {
  summary: {
    totalRequisitions: number;
    approvedRequisitions: number;
    totalPurchaseOrders: number;
    totalProcurement: number;
    totalGoodsReceipts: number;
    totalReceived: number;
    totalInvoices: number;
    totalInvoice: number;
    paidInvoice: number;
    unpaidInvoice: number;
    totalStockTransactions: number;
  };
  statuses: Record<string, Record<string, number>>;
  monthlySpending: {
    month: string;
    amount: number;
  }[];
  requisitions: any[];
  purchaseOrders: any[];
  goodsReceipts: any[];
  invoices: any[];
  stockTransactions: any[];
};

type ReportTab =
  | "purchaseOrders"
  | "requisitions"
  | "goodsReceipts"
  | "invoices"
  | "stockTransactions";

// Tipe untuk setiap baris tabel laporan.
type ReportRow = {
  [key: string]: string | number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const Reports = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [activeTab, setActiveTab] = useState<ReportTab>("purchaseOrders");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mengambil data laporan dari backend.
  const fetchReports = async (startDate = from, endDate = to) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reports", {
        params: {
          ...(startDate && { from: startDate }),
          ...(endDate && { to: endDate }),
        },
      });

      setData(response.data.data);
    } catch (err: any) {
      console.error("Gagal mengambil laporan:", err);

      setError(err.response?.data?.message || "Gagal mengambil data laporan.");
    } finally {
      setLoading(false);
    }
  };

  // Mengambil data pertama kali halaman dibuka.
  useEffect(() => {
    fetchReports("", "");
  }, []);

  // Mengubah nilai menjadi format Rupiah.
  function toCurrency(value: number | string) {
    return formatCurrency(Number(value || 0));
  }

  // Menentukan isi tabel sesuai tab yang dipilih.
  const rows = useMemo<ReportRow[]>(() => {
    if (!data) return [];

    switch (activeTab) {
      case "requisitions":
        return data.requisitions.map((item) => ({
          Nomor: item.requestNumber,
          Judul: item.title,
          Departemen: item.department,
          Pemohon: item.requestedBy?.name || "-",
          Tanggal: formatDate(item.createdAt),
          Status: item.status,
        }));

      case "goodsReceipts":
        return data.goodsReceipts.map((item) => ({
          Nomor: item.receiptNumber,
          PurchaseOrder: item.purchaseOrder?.poNumber || "-",
          Vendor: item.purchaseOrder?.vendor?.companyName || "-",
          Gudang: item.warehouse?.warehouseName || "-",
          Tanggal: formatDate(item.receivedDate),
          Status: item.status,
          "Jumlah Diterima": item.items.reduce(
            (sum: number, detail: any) => sum + detail.quantityReceived,
            0,
          ),
        }));

      case "invoices":
        return data.invoices.map((item) => ({
          Nomor: item.invoiceNumber,
          Vendor: item.vendor?.companyName || "-",
          PurchaseOrder: item.purchaseOrder?.poNumber || "-",
          Tanggal: formatDate(item.invoiceDate),
          Total: toCurrency(item.totalAmount),
          Status: item.status,
          Dibayar: item.paidAt ? formatDate(item.paidAt) : "-",
        }));

      case "stockTransactions":
        return data.stockTransactions.map((item) => ({
          Nomor: item.transactionNumber,
          Barang: item.inventoryItem?.itemName || "-",
          Kode: item.inventoryItem?.itemCode || "-",
          Gudang: item.warehouse?.warehouseName || "-",
          Tipe: item.transactionType,
          Perubahan: `${item.quantityChange} ${item.inventoryItem?.unit || ""}`,
          "Stok Sebelum": item.stockBefore,
          "Stok Sesudah": item.stockAfter,
          Tanggal: formatDate(item.createdAt),
        }));

      default:
        return data.purchaseOrders.map((item) => ({
          Nomor: item.poNumber,
          Vendor: item.vendor?.companyName || "-",
          Tanggal: formatDate(item.orderDate),
          Subtotal: toCurrency(item.subtotal),
          Pajak: toCurrency(item.tax),
          Total: toCurrency(item.totalAmount),
          Status: item.status,
        }));
    }
  }, [data, activeTab]);

  // Mengunduh data tabel dalam format CSV.
  const exportCSV = () => {
    if (!rows.length) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `procurepro-${activeTab}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Tampilan ketika data sedang dimuat.
  if (loading) {
    return <div className="reports-loading">Memuat laporan...</div>;
  }

  // Tampilan jika terjadi error.
  if (error) {
    return (
      <div className="reports-page">
        <h1>Procurement Reports</h1>

        <div className="reports-error">{error}</div>

        <button onClick={() => fetchReports()}>Coba Lagi</button>
      </div>
    );
  }

  if (!data) return null;

  const summary = data.summary;

  // Data kartu ringkasan.
  const cards = [
    {
      title: "Total Requisitions",
      value: summary.totalRequisitions,
      detail: `${summary.approvedRequisitions} disetujui`,
      icon: "📋",
    },
    {
      title: "Purchase Orders",
      value: summary.totalPurchaseOrders,
      detail: formatCurrency(summary.totalProcurement),
      icon: "🛒",
    },
    {
      title: "Goods Receipts",
      value: summary.totalGoodsReceipts,
      detail: `${summary.totalReceived} unit diterima`,
      icon: "📦",
    },
    {
      title: "Total Invoices",
      value: summary.totalInvoices,
      detail: formatCurrency(summary.totalInvoice),
      icon: "🧾",
    },
    {
      title: "Paid Invoices",
      value: formatCurrency(summary.paidInvoice),
      detail: "Invoice berstatus PAID",
      icon: "💰",
    },
    {
      title: "Stock Transactions",
      value: summary.totalStockTransactions,
      detail: "Seluruh pergerakan stok",
      icon: "↔️",
    },
  ];

  // Nilai tertinggi untuk skala grafik.
  const maxSpending = Math.max(
    ...data.monthlySpending.map((item) => item.amount),
    1,
  );

  // Daftar tab laporan.
  const tabs: {
    key: ReportTab;
    label: string;
  }[] = [
    {
      key: "purchaseOrders",
      label: "Purchase Orders",
    },
    {
      key: "requisitions",
      label: "Requisitions",
    },
    {
      key: "goodsReceipts",
      label: "Goods Receipt",
    },
    {
      key: "invoices",
      label: "Invoices",
    },
    {
      key: "stockTransactions",
      label: "Stock Transactions",
    },
  ];

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-heading">
        <div>
          <span className="reports-eyebrow">ANALYTICS & REPORTING</span>

          <h1>Procurement Reports</h1>

          <p>
            Pantau aktivitas pengadaan, penerimaan barang, invoice, dan
            persediaan perusahaan.
          </p>
        </div>

        <button className="reports-print" onClick={() => window.print()}>
          🖨 Cetak / PDF
        </button>
      </div>

      {/* Filter tanggal */}
      <section className="reports-filters">
        <div>
          <label htmlFor="report-from">Dari Tanggal</label>

          <input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="report-to">Sampai Tanggal</label>

          <input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <button onClick={() => fetchReports()}>Terapkan Filter</button>

        <button
          className="reports-reset"
          onClick={() => {
            setFrom("");
            setTo("");
            fetchReports("", "");
          }}
        >
          Reset
        </button>
      </section>

      {/* Summary cards */}
      <section className="reports-summary">
        {cards.map((card) => (
          <article className="report-card" key={card.title}>
            <div className="report-card-top">
              <span>{card.title}</span>

              <span className="report-card-icon">{card.icon}</span>
            </div>

            <h2>{card.value.toLocaleString("id-ID")}</h2>

            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      {/* Grafik pengeluaran */}
      <section className="reports-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Monthly Procurement Spending</h2>

            <p>Total nilai Purchase Order berdasarkan bulan.</p>
          </div>
        </div>

        {data.monthlySpending.length === 0 ? (
          <p className="reports-empty">Belum ada data pengadaan.</p>
        ) : (
          <div className="reports-chart">
            {data.monthlySpending.map((item) => (
              <div className="reports-chart-column" key={item.month}>
                <span className="reports-chart-value">
                  {formatCurrency(item.amount)}
                </span>

                <div className="reports-chart-track">
                  <div
                    className="reports-chart-bar"
                    style={{
                      height: `${Math.max(
                        5,
                        (item.amount / maxSpending) * 100,
                      )}%`,
                    }}
                  />
                </div>

                <span>{item.month}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tabel laporan */}
      <section className="reports-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Transaction Reports</h2>

            <p>Detail transaksi berdasarkan kategori laporan.</p>
          </div>

          <button className="reports-export" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        </div>

        {/* Tab kategori */}
        <div className="reports-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabel */}
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                {rows.length > 0 &&
                  Object.keys(rows[0]).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="reports-empty">
                    Tidak ada data pada periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex}>{String(value ?? "-")}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;

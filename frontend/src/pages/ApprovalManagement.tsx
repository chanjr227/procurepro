import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/approvals.css";

interface ApprovalItem {
  id: number;
  itemName: string;
  description?: string | null;
  quantity: number;
  unit: string;
  estimatedUnitPrice: string | number;
}

interface Requisition {
  id: number;
  requestNumber: string;
  title: string;
  description?: string | null;
  department: string;
  neededDate?: string | null;
  status: string;
  createdAt: string;
  requestedBy?: {
    id: number;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  items: ApprovalItem[];
}

interface ApprovalHistory {
  id: number;
  action: string;
  comments?: string | null;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
  };
  requisition?: {
    requestNumber: string;
    title: string;
    department: string;
    status: string;
  };
}

export default function ApprovalManagement() {
  const [pending, setPending] = useState<Requisition[]>([]);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [error, setError] = useState("");

  const formatDate = (date?: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [pendingResponse, historyResponse] = await Promise.all([
        api.get("/approvals/pending"),
        api.get("/approvals/history"),
      ]);

      setPending(pendingResponse.data.data || []);
      setHistory(historyResponse.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Gagal mengambil data approval. Periksa koneksi backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetail = async (id: number) => {
    try {
      setError("");

      const response = await api.get(`/approvals/${id}`);
      setSelected(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil detail requisition.",
      );
    }
  };

  const handleApprove = async () => {
    if (!selected) return;

    const confirmed = window.confirm(
      `Setujui requisition ${selected.requestNumber}?`,
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError("");

      await api.post(`/approvals/${selected.id}/approve`, {});

      setSelected(null);
      await loadData();

      window.alert("Requisition berhasil disetujui.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyetujui requisition.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;

    if (!rejectReason.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      await api.post(`/approvals/${selected.id}/reject`, {
        comments: rejectReason.trim(),
      });

      setSelected(null);
      setShowReject(false);
      setRejectReason("");

      await loadData();

      window.alert("Requisition berhasil ditolak.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menolak requisition.");
    } finally {
      setProcessing(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setShowReject(false);
    setRejectReason("");
    setError("");
  };

  return (
    <div className="approval-page">
      <div className="approval-header">
        <div>
          <span className="approval-eyebrow">PROCUREMENT WORKSPACE</span>
          <h1>Approval Management</h1>
          <p>Kelola dan tinjau permintaan pengadaan sebelum disetujui.</p>
        </div>

        <button className="approval-refresh" onClick={loadData}>
          ↻ Refresh Data
        </button>
      </div>

      <div className="approval-stats">
        <div className="approval-stat-card">
          <span className="stat-icon pending-icon">◷</span>
          <div>
            <p>Menunggu Persetujuan</p>
            <h2>{pending.length}</h2>
          </div>
        </div>

        <div className="approval-stat-card">
          <span className="stat-icon history-icon">✓</span>
          <div>
            <p>Total Riwayat Approval</p>
            <h2>{history.length}</h2>
          </div>
        </div>

        <div className="approval-stat-card">
          <span className="stat-icon approved-icon">↗</span>
          <div>
            <p>Total Disetujui</p>
            <h2>
              {history.filter((item) => item.action === "APPROVED").length}
            </h2>
          </div>
        </div>

        <div className="approval-stat-card">
          <span className="stat-icon rejected-icon">×</span>
          <div>
            <p>Total Ditolak</p>
            <h2>
              {history.filter((item) => item.action === "REJECTED").length}
            </h2>
          </div>
        </div>
      </div>

      {error && <div className="approval-error">{error}</div>}

      <div className="approval-panel">
        <div className="approval-tabs">
          <button
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Menunggu Persetujuan
            <span>{pending.length}</span>
          </button>

          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            Riwayat Approval
          </button>
        </div>

        {loading ? (
          <div className="approval-empty">Memuat data approval...</div>
        ) : activeTab === "pending" ? (
          <div className="approval-table-wrap">
            <table className="approval-table">
              <thead>
                <tr>
                  <th>Nomor Request</th>
                  <th>Judul Permintaan</th>
                  <th>Departemen</th>
                  <th>Pemohon</th>
                  <th>Tanggal Dibutuhkan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="approval-empty">
                      Tidak ada permintaan yang menunggu persetujuan.
                    </td>
                  </tr>
                ) : (
                  pending.map((item) => (
                    <tr key={item.id}>
                      <td className="request-number">{item.requestNumber}</td>
                      <td>{item.title}</td>
                      <td>{item.department}</td>
                      <td>{item.requestedBy?.name || "-"}</td>
                      <td>{formatDate(item.neededDate)}</td>
                      <td>
                        <span className="approval-status status-pending">
                          PENDING
                        </span>
                      </td>
                      <td>
                        <button
                          className="approval-detail-btn"
                          onClick={() => openDetail(item.id)}
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="approval-table-wrap">
            <table className="approval-table">
              <thead>
                <tr>
                  <th>Nomor Request</th>
                  <th>Judul Permintaan</th>
                  <th>Departemen</th>
                  <th>Petugas</th>
                  <th>Tindakan</th>
                  <th>Komentar</th>
                  <th>Tanggal</th>
                </tr>
              </thead>

              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="approval-empty">
                      Belum ada riwayat approval.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td className="request-number">
                        {item.requisition?.requestNumber || "-"}
                      </td>
                      <td>{item.requisition?.title || "-"}</td>
                      <td>{item.requisition?.department || "-"}</td>
                      <td>{item.actor?.name || "-"}</td>
                      <td>
                        <span
                          className={`approval-status ${
                            item.action === "APPROVED"
                              ? "status-approved"
                              : "status-rejected"
                          }`}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td>{item.comments || "-"}</td>
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="approval-modal-overlay" onClick={closeDetail}>
          <div
            className="approval-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="approval-modal-header">
              <div>
                <span className="approval-eyebrow">REQUEST DETAIL</span>
                <h2>{selected.requestNumber}</h2>
                <p>Informasi lengkap permintaan pengadaan.</p>
              </div>

              <button className="approval-close" onClick={closeDetail}>
                ×
              </button>
            </div>

            <div className="approval-detail-grid">
              <div>
                <span>Judul Permintaan</span>
                <strong>{selected.title}</strong>
              </div>
              <div>
                <span>Departemen</span>
                <strong>{selected.department}</strong>
              </div>
              <div>
                <span>Pemohon</span>
                <strong>{selected.requestedBy?.name || "-"}</strong>
              </div>
              <div>
                <span>Tanggal Dibutuhkan</span>
                <strong>{formatDate(selected.neededDate)}</strong>
              </div>
              <div className="detail-full">
                <span>Deskripsi</span>
                <strong>{selected.description || "-"}</strong>
              </div>
            </div>

            <h3 className="approval-items-title">Daftar Barang</h3>

            <div className="approval-table-wrap">
              <table className="approval-table">
                <thead>
                  <tr>
                    <th>Nama Barang</th>
                    <th>Jumlah</th>
                    <th>Harga Satuan</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items?.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.itemName}</strong>
                        {item.description && (
                          <small className="item-description">
                            {item.description}
                          </small>
                        )}
                      </td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      <td>{formatCurrency(item.estimatedUnitPrice)}</td>
                      <td>
                        {formatCurrency(
                          Number(item.estimatedUnitPrice) * item.quantity,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="approval-modal-actions">
              <button
                className="approval-reject-btn"
                disabled={processing}
                onClick={() => {
                  setError("");
                  setShowReject(true);
                }}
              >
                Reject
              </button>

              <button
                className="approval-approve-btn"
                disabled={processing}
                onClick={handleApprove}
              >
                {processing ? "Memproses..." : "Approve"}
              </button>
            </div>

            {showReject && (
              <div className="approval-reject-form">
                <label htmlFor="rejectReason">Alasan Penolakan</label>
                <textarea
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Tuliskan alasan penolakan..."
                />

                <div className="reject-form-actions">
                  <button
                    className="approval-cancel-btn"
                    disabled={processing}
                    onClick={() => {
                      setShowReject(false);
                      setRejectReason("");
                      setError("");
                    }}
                  >
                    Batal
                  </button>

                  <button
                    className="approval-reject-btn"
                    disabled={processing}
                    onClick={handleReject}
                  >
                    {processing ? "Memproses..." : "Konfirmasi Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

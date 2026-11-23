import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/user-management.css";

type Role = {
  id: number;
  name: string;
  description?: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  roleId: number;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  roleName: string;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  roleName: "REQUESTER",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PROCUREMENT_MANAGER: "Procurement Manager",
  PROCUREMENT_STAFF: "Procurement Staff",
  WAREHOUSE_MANAGER: "Warehouse Manager",
  WAREHOUSE_STAFF: "Warehouse Staff",
  FINANCE: "Finance",
  REQUESTER: "Requester",
  AUDITOR: "Auditor",
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [summary, setSummary] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalRoles: 0,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  // Mengatur tampilan password.
  const [showPassword, setShowPassword] = useState(false);

  // Mengatur modal reset password.
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const [userResponse, roleResponse] = await Promise.all([
        api.get("/users"),
        api.get("/users/roles"),
      ]);

      setUsers(userResponse.data.data.users || []);
      setSummary(
        userResponse.data.data.summary || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          totalRoles: 0,
        },
      );

      setRoles(roleResponse.data.data || []);
    } catch (err: any) {
      console.error("Fetch Users Error:", err);

      setError(
        err.response?.data?.message ||
          "Gagal mengambil data pengguna. Pastikan akun memiliki akses Super Admin.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const matchesRole = !roleFilter || user.role?.name === roleFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);

    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roleName: user.role.name,
    });

    setShowPassword(false);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
  };

  const openResetPassword = (user: User) => {
    setResetUser(user);
    setResetPassword("");
    setShowResetPassword(false);
    setError("");
  };

  const closeResetPassword = () => {
    setResetUser(null);
    setResetPassword("");
    setShowResetPassword(false);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          name: form.name,
          email: form.email,
          roleName: form.roleName,
        });

        setSuccess("Data pengguna berhasil diperbarui.");
      } else {
        await api.post("/users", form);
        setSuccess("Pengguna baru berhasil ditambahkan.");
      }

      closeModal();
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data pengguna.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (user: User) => {
    const nextStatus = !user.isActive;

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${
        nextStatus ? "mengaktifkan" : "menonaktifkan"
      } akun ${user.name}?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.patch(`/users/${user.id}/status`, {
        isActive: nextStatus,
      });

      setSuccess(
        nextStatus
          ? "Akun berhasil diaktifkan."
          : "Akun berhasil dinonaktifkan.",
      );

      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengubah status akun.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!resetUser) return;

    if (resetPassword.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.patch(`/users/${resetUser.id}/password`, {
        password: resetPassword,
      });

      setSuccess(`Password ${resetUser.name} berhasil diubah.`);
      closeResetPassword();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengubah password.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="user-management">
      <div className="um-heading">
        <div>
          <span className="um-eyebrow">SYSTEM ADMINISTRATION</span>
          <h1>User Management</h1>
          <p>Kelola akun pengguna dan hak akses ProcurePro.</p>
        </div>

        <button className="um-primary" onClick={openCreateModal}>
          + Tambah Pengguna
        </button>
      </div>

      {error && !showModal && !resetUser && (
        <div className="um-alert um-alert-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="um-alert um-alert-success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <div className="um-summary">
        <article className="um-summary-card">
          <span>Total Users</span>
          <h2>{summary.totalUsers}</h2>
          <small>Seluruh akun terdaftar</small>
        </article>

        <article className="um-summary-card">
          <span>Active Users</span>
          <h2>{summary.activeUsers}</h2>
          <small>Akun aktif</small>
        </article>

        <article className="um-summary-card">
          <span>Inactive Users</span>
          <h2>{summary.inactiveUsers}</h2>
          <small>Akun dinonaktifkan</small>
        </article>

        <article className="um-summary-card">
          <span>Available Roles</span>
          <h2>{summary.totalRoles}</h2>
          <small>Role terdaftar</small>
        </article>
      </div>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div>
            <h2>Daftar Pengguna</h2>
            <p>{filteredUsers.length} pengguna ditemukan.</p>
          </div>

          <button
            className="um-refresh"
            onClick={fetchUsers}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="um-filters">
          <input
            type="search"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Semua Role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {roleLabels[role.name] || role.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tanggal Dibuat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="um-empty">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="um-empty">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="um-user">
                        <div className="um-avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          <small>ID: {user.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span className="um-role">
                        {roleLabels[user.role.name] || user.role.name}
                      </span>
                    </td>

                    <td>{formatDate(user.createdAt)}</td>

                    <td>
                      <span
                        className={`um-status ${
                          user.isActive ? "active" : "inactive"
                        }`}
                      >
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td>
                      <div className="um-actions">
                        <button
                          title="Edit pengguna"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>

                        <button
                          title="Reset password"
                          onClick={() => openResetPassword(user)}
                        >
                          Password
                        </button>

                        <button
                          className={
                            user.isActive ? "um-danger" : "um-activate"
                          }
                          onClick={() => handleStatus(user)}
                        >
                          {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal tambah dan edit pengguna */}
      {showModal && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <div className="um-modal-heading">
              <div>
                <h2>{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
                <p>Lengkapi informasi akun pengguna.</p>
              </div>

              <button className="um-close" onClick={closeModal} type="button">
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <label>Nama Lengkap</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                required
              />

              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@perusahaan.com"
                required
              />

              {!editingUser && (
                <>
                  <label>Password</label>

                  <div className="um-password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      required
                    />

                    <button
                      type="button"
                      className="um-password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Sembunyikan password" : "Lihat password"
                      }
                      title={
                        showPassword ? "Sembunyikan password" : "Lihat password"
                      }
                    >
                      {showPassword ? "◉" : "◎"}
                    </button>
                  </div>
                </>
              )}

              <label>Role Pengguna</label>
              <select
                value={form.roleName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    roleName: e.target.value,
                  })
                }
                required
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {roleLabels[role.name] || role.name}
                  </option>
                ))}
              </select>

              {error && <div className="um-modal-error">{error}</div>}

              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button type="submit" className="um-primary" disabled={saving}>
                  {saving
                    ? "Menyimpan..."
                    : editingUser
                      ? "Simpan Perubahan"
                      : "Tambah Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {resetUser && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <div className="um-modal-heading">
              <div>
                <h2>Ubah Password</h2>
                <p>
                  Masukkan password baru untuk <strong>{resetUser.name}</strong>
                  .
                </p>
              </div>

              <button
                className="um-close"
                onClick={closeResetPassword}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <label>Password Baru</label>

              <div className="um-password-field">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="um-password-toggle"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  aria-label={
                    showResetPassword
                      ? "Sembunyikan password"
                      : "Lihat password"
                  }
                  title={
                    showResetPassword
                      ? "Sembunyikan password"
                      : "Lihat password"
                  }
                >
                  {showResetPassword ? "◉" : "◎"}
                </button>
              </div>

              {error && <div className="um-modal-error">{error}</div>}

              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-cancel"
                  onClick={closeResetPassword}
                  disabled={saving}
                >
                  Batal
                </button>

                <button type="submit" className="um-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

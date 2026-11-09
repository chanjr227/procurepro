import { useState } from "react";
import api from "../services/api";

interface LoginProps {
  onLoginSuccess: (data: {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      onLoginSuccess(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-logo">P</div>

        <h1>ProcurePro</h1>
        <p className="brand-subtitle">PROCUREMENT MANAGEMENT SYSTEM</p>

        <div className="brand-content">
          <span className="brand-tag">SMART PROCUREMENT</span>

          <h2>
            Manage Procurement.
            <br />
            Empower Your Business.
          </h2>

          <p>
            Kelola pengadaan, vendor, purchase order, dan proses persetujuan
            perusahaan dalam satu platform terintegrasi.
          </p>
        </div>

        <div className="brand-footer">
          © 2026 ProcurePro. All rights reserved.
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <div className="mobile-logo">
            <div className="brand-logo">P</div>
            <strong>ProcurePro</strong>
          </div>

          <span className="welcome-label">WELCOME BACK</span>

          <h2>Sign in to your account</h2>

          <p className="login-description">
            Masukkan informasi akun untuk melanjutkan.
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">Password</label>
              </div>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-security">
            <span>🔒</span>
            Secure authentication powered by ProcurePro
          </div>
        </div>
      </section>
    </main>
  );
}

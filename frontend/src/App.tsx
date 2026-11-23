import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LoginData {
  token: string;
  user: User;
}

// Mengatur autentikasi pengguna dan navigasi aplikasi.
function App() {
  // Memulihkan sesi pengguna dari browser.
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Menentukan halaman yang sedang dibuka.
  const [activePage, setActivePage] = useState("dashboard");

  // Menyimpan sesi setelah login berhasil.
  const handleLoginSuccess = (data: LoginData) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
    setActivePage("dashboard");
  };

  // Menghapus sesi pengguna.
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setActivePage("dashboard");
  };

  // Menampilkan halaman login jika belum masuk.
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Semua halaman setelah login dikelola melalui Dashboard.
  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onNavigate={setActivePage}
      activePage={activePage}
    />
  );
}

export default App;

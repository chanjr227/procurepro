import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VendorManagement from "./pages/VendorManagement";

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

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activePage, setActivePage] = useState("dashboard");

  const handleLoginSuccess = (data: LoginData) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setActivePage("dashboard");
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (activePage === "vendors") {
    return (
      <VendorManagement
        user={user}
        onLogout={handleLogout}
        onNavigate={setActivePage}
      />
    );
  }

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

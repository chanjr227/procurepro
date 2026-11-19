import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Otomatis menyertakan JWT setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Jika token kedaluwarsa, kembalikan pengguna ke halaman login
api.interceptors.response.use(
  // Meneruskan respons API yang berhasil.
  (response) => response,
  // Membersihkan sesi jika API menolak token, lalu meneruskan error.
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }

    return Promise.reject(error);
  },
);

export default api;

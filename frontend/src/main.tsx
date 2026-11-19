import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import "./css/global.css";

// Memasang aplikasi React ke elemen root halaman.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

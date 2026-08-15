import React from "react";
import ReactDOM from "react-dom/client";
import AdminFinanceApp from "./modules/admin-finance/AdminFinanceApp";
import "./modules/admin-finance/styles/admin-finance-entry.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminFinanceApp />
  </React.StrictMode>,
);

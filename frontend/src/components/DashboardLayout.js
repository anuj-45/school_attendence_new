import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = ({ title, children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <Sidebar role={user?.role} onLogout={handleLogout} />
      <main className="content">
        <Navbar title={title} user={user} />
        <section>{children}</section>
      </main>
    </div>
  );
};

export default DashboardLayout;

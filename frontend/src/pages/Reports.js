import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Reports = () => {
  const { user } = useAuth();
  const basePath = user?.role === "teacher" ? "/teacher/attendance/reports" : "/admin/attendance/reports";
  return <Navigate to={`${basePath}?mode=date`} replace />;
};

export default Reports;

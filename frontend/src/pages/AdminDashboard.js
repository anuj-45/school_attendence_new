import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, attendancePercent: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const response = await api.get("/admin/stats");
      setStats(response.data);
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="cards-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{stats.totalStudents}</p>
        </div>
        <div className="stat-card">
          <h3>Total Teachers</h3>
          <p>{stats.totalTeachers}</p>
        </div>
        <div className="stat-card">
          <h3>Attendance %</h3>
          <p>{stats.attendancePercent}%</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

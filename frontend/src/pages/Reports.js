import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";

const reportItems = [
  {
    label: "Daily / Calendar Data",
    description: "View attendance for a single day or calendar-style daily report.",
    params: "?mode=date",
  },
  {
    label: "Monthly Report",
    description: "See attendance summaries for a selected month.",
    params: "?mode=month",
  },
  {
    label: "Yearly Report",
    description: "Review attendance performance across a full year.",
    params: "?mode=year",
  },
  {
    label: "Student-wise History",
    description: "Track attendance history for individual students.",
    params: "?mode=student",
  },
  {
    label: "Class-wise Report",
    description: "Analyze attendance by class and section.",
    params: "?mode=class",
  },
];

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "teacher" ? "/teacher/attendance/reports" : "/admin/attendance/reports";

  return (
    <DashboardLayout title="Reports">
      <div className="panel">
        <p className="section-description">
          Choose the report you want to view. After selecting a report type, you can filter by date, month, year, student, or class.
        </p>
      </div>
      <div className="cards-grid report-cards-grid">
        {reportItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="report-card"
            onClick={() => navigate(`${basePath}${item.params}`)}
          >
            <div className="report-card-title">{item.label}</div>
            <div className="report-card-description">{item.description}</div>
          </button>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Reports;

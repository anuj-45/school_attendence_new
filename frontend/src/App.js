import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import SendAbsentEmails from "./pages/SendAbsentEmails";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Students />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teachers"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Teachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance/reports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AttendanceReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance/reports"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <AttendanceReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance/send-email"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <SendAbsentEmails />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;

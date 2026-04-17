import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Attendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [markDate, setMarkDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const toNextDay = (dateText) => {
    const d = new Date(`${dateText}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const openReport = (mode) => {
    const basePath = isTeacher ? "/teacher/attendance/reports" : "/admin/attendance/reports";
    if (mode === "date") {
      navigate(`${basePath}?mode=date&date=${markDate}`);
      return;
    }
    if (mode === "month") {
      navigate(`${basePath}?mode=month&month=${markDate.slice(0, 7)}`);
      return;
    }
    navigate(`${basePath}?mode=year&year=${markDate.slice(0, 4)}`);
  };

  const loadData = async () => {
    if (isTeacher) {
      try {
        setLoading(true);
        setApiError("");
        const [studentRes, attendanceRes] = await Promise.all([
          api.get("/teacher/students"),
          api.get("/teacher/attendance", { params: { date: markDate } }),
        ]);
        setStudents(studentRes.data.students);
        const existingMap = {};
        (attendanceRes.data.records || []).forEach((record) => {
          if (record.student_id) {
            existingMap[record.student_id] = record.status;
          } else if (record.student?.id) {
            existingMap[record.student.id] = record.status;
          }
        });
        setStatusMap(existingMap);
      } catch (error) {
        setApiError(error.response?.data?.message || "Failed to load attendance for selected date");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [markDate, user?.role]);

  const handleStatusChange = (studentId, value) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const submitAttendance = async () => {
    if (!isTeacher) {
      return;
    }

    setApiError("");

    const recordsToSubmit = Object.entries(statusMap)
      .filter(([, value]) => value)
      .map(([studentId, value]) => ({ student_id: Number(studentId), status: value }));

    if (recordsToSubmit.length === 0) {
      setApiError("Please mark at least one student");
      return;
    }

    try {
      await api.post("/teacher/mark-attendance", { records: recordsToSubmit, date: markDate });
      setMarkDate((prev) => toNextDay(prev));
      await loadData();
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to submit attendance");
    }
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="panel">
        <label>Attendence Reports</label>
        <div className="filter-mode-row">
          <button
            type="button"
            className="filter-mode-btn"
            onClick={() => openReport("date")}
          >
            Datewise
          </button>
          <button
            type="button"
            className="filter-mode-btn"
            onClick={() => openReport("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className="filter-mode-btn"
            onClick={() => openReport("year")}
          >
            Yearly
          </button>
        </div>
      </div>
      {isTeacher && (
        <>
          <div className="panel">
            <div className="panel-top-row">
              <h3>Mark Attendance</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate(`/teacher/attendance/send-email?date=${markDate}`)}
              >
                Send Email To Parents
              </button>
            </div>
            {apiError && <div className="error-text">{apiError}</div>}
            <label>Attendance Date</label>
            <input type="date" value={markDate} onChange={(event) => setMarkDate(event.target.value)} />
            {loading && <p>Loading attendance...</p>}
            <div className="attendance-list">
              {students.map((student) => (
                <div className="attendance-row" key={student.id}>
                  <span>
                    {student.name} ({student.class_grade}-{student.division} - {student.roll_number})
                  </span>
                  <div className="status-buttons">
                    {["Present", "Absent", "Late"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={statusMap[student.id] === status ? "active-status" : ""}
                        onClick={() => handleStatusChange(student.id, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="submit-btn" onClick={submitAttendance}>
              Submit Attendance
            </button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Attendance;

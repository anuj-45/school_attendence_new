import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";

const AttendanceReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState(params.get("mode") || "date");
  const [date, setDate] = useState(params.get("date") || new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(params.get("month") || new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(params.get("year") || String(new Date().getFullYear()));
  const [records, setRecords] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateUrl = (nextMode, nextDate, nextMonth, nextYear) => {
    const query = new URLSearchParams();
    query.set("mode", nextMode);
    if (nextMode === "date") {
      query.set("date", nextDate);
    }
    if (nextMode === "month") {
      query.set("month", nextMonth);
    }
    if (nextMode === "year") {
      query.set("year", nextYear);
    }
    navigate(`${location.pathname}?${query.toString()}`, { replace: true });
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const requestParams = {};
      if (mode === "date") {
        requestParams.date = date;
      }
      if (mode === "month") {
        requestParams.month = month;
      }
      if (mode === "year") {
        requestParams.year = year;
      }

      const response = await api.get("/attendance/history", { params: requestParams });
      setRecords(response.data.records || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load attendance reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateUrl(mode, date, month, year);
    loadRecords();
  }, [mode, date, month, year]);

  const studentNameOptions = useMemo(() => {
    const seen = new Set();
    const names = [];
    records.forEach((record) => {
      const name = (record.student?.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        names.push(name);
      }
    });
    return names.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const nameSuggestions = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return studentNameOptions
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 3);
  }, [studentNameOptions, studentSearch]);

  const filteredRecords = useMemo(() => {
    if (!selectedStudentName) {
      return records;
    }
    const selected = selectedStudentName.toLowerCase();
    return records.filter((record) => (record.student?.name || "").toLowerCase() === selected);
  }, [records, selectedStudentName]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "Present").length;
    const absent = filteredRecords.filter((r) => r.status === "Absent").length;
    const late = filteredRecords.filter((r) => r.status === "Late").length;

    const percent = (value) => (total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0);

    return {
      total,
      present,
      absent,
      late,
      presentPct: percent(present),
      absentPct: percent(absent),
      latePct: percent(late),
    };
  }, [filteredRecords]);

  const pieStyle = {
    background: `conic-gradient(
      #22c55e 0% ${stats.presentPct}%,
      #ef4444 ${stats.presentPct}% ${stats.presentPct + stats.absentPct}%,
      #f59e0b ${stats.presentPct + stats.absentPct}% 100%
    )`,
  };

  return (
    <DashboardLayout title="Attendance Reports">
      <div className="panel">
        <label>Attendence Filter</label>
        <div className="filter-mode-row">
          <button
            type="button"
            className={`filter-mode-btn ${mode === "date" ? "active" : ""}`}
            onClick={() => setMode("date")}
          >
            Datewise
          </button>
          <button
            type="button"
            className={`filter-mode-btn ${mode === "month" ? "active" : ""}`}
            onClick={() => setMode("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`filter-mode-btn ${mode === "year" ? "active" : ""}`}
            onClick={() => setMode("year")}
          >
            Yearly
          </button>
        </div>

        {mode === "date" && (
          <>
            <label>Date</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </>
        )}
        {mode === "month" && (
          <>
            <label>Month</label>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </>
        )}
        {mode === "year" && (
          <>
            <label>Year</label>
            <input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} />
          </>
        )}
      </div>

      <div className="panel">
        <label>Search Student</label>
        <SearchBar
          value={studentSearch}
          onChange={(value) => {
            setStudentSearch(value);
            if (!value.trim()) {
              setSelectedStudentName("");
            }
          }}
          placeholder="Search student name..."
        />
        {nameSuggestions.length > 0 && (
          <div className="suggestion-list">
            {nameSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="suggestion-item"
                onClick={() => {
                  setStudentSearch(name);
                  setSelectedStudentName(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {selectedStudentName && (
          <button
            type="button"
            className="table-action-btn"
            onClick={() => {
              setSelectedStudentName("");
              setStudentSearch("");
            }}
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="panel">
        <h3>Summary Figures</h3>
        <div className="cards-grid report-cards-grid">
          <div className="stat-card">
            <h3>Total</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Present</h3>
            <p>{stats.present}</p>
          </div>
          <div className="stat-card">
            <h3>Absent</h3>
            <p>{stats.absent}</p>
          </div>
          <div className="stat-card">
            <h3>Late</h3>
            <p>{stats.late}</p>
          </div>
        </div>
      </div>

      <div className="panel report-panel">
        <div className="pie-chart" style={pieStyle}>
          <div className="pie-hole">{stats.total}</div>
        </div>
        <div className="report-legends">
          <div><strong>Present:</strong> {stats.presentPct}%</div>
          <div><strong>Absent:</strong> {stats.absentPct}%</div>
          <div><strong>Late:</strong> {stats.latePct}%</div>
        </div>
      </div>
      {loading && <div className="panel"><p>Loading records...</p></div>}
      {error && <div className="panel"><div className="error-text">{error}</div></div>}
    </DashboardLayout>
  );
};

export default AttendanceReports;

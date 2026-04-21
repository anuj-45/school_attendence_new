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
  const [selectedStudentName, setSelectedStudentName] = useState(params.get("studentName") || "");
  const [studentCategory, setStudentCategory] = useState(params.get("studentCategory") || "date");
  const [selectedClassGrade, setSelectedClassGrade] = useState(params.get("classGrade") || "");
  const [selectedDivision, setSelectedDivision] = useState(params.get("division") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateUrl = (
    nextMode,
    nextDate,
    nextMonth,
    nextYear,
    nextStudentName,
    nextClassGrade,
    nextDivision,
    nextStudentCategory
  ) => {
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
    if (nextMode === "student") {
      if (nextStudentCategory) query.set("studentCategory", nextStudentCategory);
      if (nextStudentName) query.set("studentName", nextStudentName);
      if (nextStudentCategory === "date") query.set("date", nextDate);
      if (nextStudentCategory === "month") query.set("month", nextMonth);
      if (nextStudentCategory === "year") query.set("year", nextYear);
    }
    if (nextMode === "class") {
      if (nextClassGrade) {
        query.set("classGrade", nextClassGrade);
      }
      if (nextDivision) {
        query.set("division", nextDivision);
      }
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
      if (mode === "student") {
        if (studentCategory === "date") requestParams.date = date;
        if (studentCategory === "month") requestParams.month = month;
        if (studentCategory === "year") requestParams.year = year;
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
    updateUrl(
      mode,
      date,
      month,
      year,
      selectedStudentName,
      selectedClassGrade,
      selectedDivision,
      studentCategory
    );
    loadRecords();
  }, [mode, date, month, year, selectedStudentName, selectedClassGrade, selectedDivision, studentCategory]);

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
    let filtered = records;

    if (mode === "student" && selectedStudentName) {
      const selected = selectedStudentName.toLowerCase();
      filtered = filtered.filter((record) => (record.student?.name || "").toLowerCase() === selected);
    }

    if (mode === "class" && selectedClassGrade) {
      filtered = filtered.filter((record) => {
        const student = record.student || {};
        if (student.class_grade !== selectedClassGrade) {
          return false;
        }
        if (selectedDivision && student.division !== selectedDivision) {
          return false;
        }
        return true;
      });
    }

    return filtered;
  }, [records, mode, selectedStudentName, selectedClassGrade, selectedDivision]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "Present").length;
    const absent = filteredRecords.filter((r) => r.status === "Absent").length;
    const late = filteredRecords.filter((r) => r.status === "Late").length;

    // Late students are counted as present for pie chart
    const presentAndLate = present + late;

    const percent = (value) => (total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0);

    return {
      total,
      present,
      absent,
      late,
      presentAndLate,
      presentPct: percent(presentAndLate),
      absentPct: percent(absent),
      latePct: percent(late),
    };
  }, [filteredRecords]);

  const pieStyle = {
    background: `conic-gradient(
      #22c55e 0% ${stats.presentPct}%,
      #ef4444 ${stats.presentPct}% 100%
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
            Calendar / Daily
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
          <button
            type="button"
            className={`filter-mode-btn ${mode === "student" ? "active" : ""}`}
            onClick={() => setMode("student")}
          >
            Student-wise
          </button>
          <button
            type="button"
            className={`filter-mode-btn ${mode === "class" ? "active" : ""}`}
            onClick={() => setMode("class")}
          >
            Class-wise
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

      {mode === "student" && (
        <div className="panel">
          <label>Student Filter Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button type="button" className={`filter-mode-btn ${studentCategory === "date" ? "active" : ""}`} onClick={() => setStudentCategory("date")}>Date</button>
            <button type="button" className={`filter-mode-btn ${studentCategory === "month" ? "active" : ""}`} onClick={() => setStudentCategory("month")}>Month</button>
            <button type="button" className={`filter-mode-btn ${studentCategory === "year" ? "active" : ""}`} onClick={() => setStudentCategory("year")}>Year</button>
          </div>

          {studentCategory === "date" && (
            <>
              <label>Date</label>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </>
          )}
          {studentCategory === "month" && (
            <>
              <label>Month</label>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </>
          )}
          {studentCategory === "year" && (
            <>
              <label>Year</label>
              <input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} />
            </>
          )}

          <div style={{ height: 12 }} />

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
      )}

      {mode === "class" && (
        <div className="panel">
          <label>Class</label>
          <select
            value={selectedClassGrade}
            onChange={(event) => {
              setSelectedClassGrade(event.target.value);
              setSelectedDivision("");
            }}
          >
            <option value="">All classes</option>
            {classGradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>

          <label>Division</label>
          <select
            value={selectedDivision}
            onChange={(event) => setSelectedDivision(event.target.value)}
            disabled={!selectedClassGrade}
          >
            <option value="">All divisions</option>
            {divisionOptions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <div><strong>Present (Including Late):</strong> {stats.presentPct}%</div>
          <div><strong>Absent:</strong> {stats.absentPct}%</div>
          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #ccc" }}>
            <strong>Late Details:</strong> {stats.late} ({stats.latePct}%)
          </div>
        </div>
      </div>
      {loading && <div className="panel"><p>Loading records...</p></div>}
      {error && <div className="panel"><div className="error-text">{error}</div></div>}
    </DashboardLayout>
  );
};

export default AttendanceReports;

import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import SearchBar from "../components/SearchBar";
import Table from "../components/Table";
import api from "../services/api";

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [studentForm, setStudentForm] = useState({ name: "", roll_number: "", parent_email: "" });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadStudents = async (searchText = debouncedSearch) => {
    const response = await api.get(`/teacher/students?search=${encodeURIComponent(searchText)}`);
    setStudents(response.data.students);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        await loadStudents();
      } catch (error) {
        setApiError(error.response?.data?.message || "Failed to load students");
      }
    };
    fetchStudents();
  }, [debouncedSearch]);

  const onStudentFormChange = (event) => {
    setStudentForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitStudent = async (event) => {
    event.preventDefault();
    setApiError("");
    setSuccessMessage("");

    if (!studentForm.name || !studentForm.roll_number || !studentForm.parent_email) {
      setApiError("Student name, roll number and parent email are required");
      return;
    }

    try {
      if (editingStudentId) {
        await api.put(`/teacher/students/${editingStudentId}`, studentForm);
        setSuccessMessage("✓ Student updated successfully!");
        setEditingStudentId(null);
      } else {
        await api.post("/teacher/students", studentForm);
        setSuccessMessage("✓ Student added successfully!");
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      setStudentForm({ name: "", roll_number: "", parent_email: "" });
      await loadStudents();
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to save student");
    }
  };

  const editStudent = (student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name || "",
      roll_number: student.roll_number || "",
      parent_email: student.parent_email || "",
    });
  };

  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setStudentForm({ name: "", roll_number: "", parent_email: "" });
    setApiError("");
    setSuccessMessage("");
  };

  const removeStudent = async (student) => {
    setApiError("");
    const confirmed = window.confirm(`Remove student ${student.name}?`);
    if (!confirmed) {
      return;
    }
    try {
      await api.delete(`/teacher/students/${student.id}`);
      await loadStudents();
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to remove student");
    }
  };

  const studentsBySection = useMemo(() => {
    return students.reduce((acc, student) => {
      const key = `${student.class_grade}-${student.division}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(student);
      return acc;
    }, {});
  }, [students]);

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="panel">
        <h3>{editingStudentId ? "Change Student Data" : "Manage Students"}</h3>
        {apiError && <div className="error-text">{apiError}</div>}
        {successMessage && <div className="success-text">{successMessage}</div>}
        
        <form className="grid-form" onSubmit={submitStudent}>
          <input name="name" value={studentForm.name} onChange={onStudentFormChange} placeholder="Student Name" />
          <input name="roll_number" value={studentForm.roll_number} onChange={onStudentFormChange} placeholder="Roll Number" />
          <input
            name="parent_email"
            value={studentForm.parent_email}
            onChange={onStudentFormChange}
            placeholder="Parent Email"
            type="email"
          />
          <button type="submit">{editingStudentId ? "Save Changes" : "Add Student"}</button>
          {editingStudentId && (
            <button type="button" className="table-action-btn" onClick={cancelEditStudent}>
              Cancel
            </button>
          )}
        </form>

        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <label>Search Students</label>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name..." />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll</th>
                <th>Class</th>
                <th>Parent Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((student) => (
                  <tr key={`teacher-student-${student.id}`}>
                    <td>{student.name}</td>
                    <td>{student.roll_number}</td>
                    <td>{student.class_grade}-{student.division}</td>
                    <td>{student.parent_email}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-action-btn" onClick={() => editStudent(student)}>
                          Change
                        </button>
                        <button type="button" className="table-action-btn danger" onClick={() => removeStudent(student)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    No students in your class
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;

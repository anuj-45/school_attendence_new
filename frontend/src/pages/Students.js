import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import SearchBar from "../components/SearchBar";
import api from "../services/api";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    name: "",
    roll_number: "",
    class_grade: "",
    division: "",
    parent_email: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentRes = await api.get(`/admin/students?search=${encodeURIComponent(debouncedSearch)}`);
        setStudents(studentRes.data.students);
      } catch (error) {
        setApiError(error.response?.data?.message || "Failed to load students");
      }
    };
    fetchData();
  }, [debouncedSearch]);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const addStudent = async (event) => {
    event.preventDefault();
    setApiError("");
    if (!form.name || !form.roll_number || !form.class_grade || !form.division || !form.parent_email) {
      setApiError("All fields are required");
      return;
    }
    try {
      if (editingStudentId) {
        await api.put(`/admin/students/${editingStudentId}`, {
          ...form,
          division: form.division.toUpperCase(),
        });
        setEditingStudentId(null);
      } else {
        await api.post("/admin/add-student", {
          ...form,
          division: form.division.toUpperCase(),
        });
      }

      setForm({ name: "", roll_number: "", class_grade: "", division: "", parent_email: "" });
      const refreshed = await api.get(`/admin/students?search=${encodeURIComponent(debouncedSearch)}`);
      setStudents(refreshed.data.students);
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to save student");
    }
  };

  const editStudent = (student) => {
    setEditingStudentId(student.id);
    setForm({
      name: student.name || "",
      roll_number: student.roll_number || "",
      class_grade: student.class_grade || "",
      division: student.division || "",
      parent_email: student.parent_email || "",
    });
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setForm({ name: "", roll_number: "", class_grade: "", division: "", parent_email: "" });
    setApiError("");
  };

  const removeStudent = async (student) => {
    setApiError("");
    const confirmed = window.confirm(`Remove student ${student.name}?`);
    if (!confirmed) {
      return;
    }
    try {
      await api.delete(`/admin/students/${student.id}`);
      const refreshed = await api.get(`/admin/students?search=${encodeURIComponent(debouncedSearch)}`);
      setStudents(refreshed.data.students);
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
    <DashboardLayout title="Students">
      <div className="panel">
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
      </div>
      <div className="panel">
        <h3>{editingStudentId ? "Change Student Data" : "Add Student"}</h3>
        {apiError && <div className="error-text">{apiError}</div>}
        <form className="grid-form" onSubmit={addStudent}>
          <input name="name" value={form.name} onChange={onChange} placeholder="Student Name" />
          <input name="roll_number" value={form.roll_number} onChange={onChange} placeholder="Roll Number" />
          <input name="class_grade" value={form.class_grade} onChange={onChange} placeholder="Class (Grade)" />
          <input name="division" value={form.division} onChange={onChange} placeholder="Division" maxLength={3} />
          <input name="parent_email" value={form.parent_email} onChange={onChange} placeholder="Parent Email" type="email" />
          <button type="submit">{editingStudentId ? "Save Changes" : "Add Student"}</button>
          {editingStudentId && (
            <button type="button" className="table-action-btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>
      {Object.keys(studentsBySection)
        .sort()
        .map((sectionKey) => {
          return (
            <div className="panel" key={sectionKey}>
              <h3>Class Section {sectionKey}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll</th>
                      <th>Class</th>
                      <th>Parent Email</th>
                      <th>Teacher</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsBySection[sectionKey].map((student) => (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>{student.roll_number}</td>
                        <td>{sectionKey}</td>
                        <td>{student.parent_email}</td>
                        <td>{student.teacher?.name || "-"}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
    </DashboardLayout>
  );
};

export default Students;

import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import SearchBar from "../components/SearchBar";
import Table from "../components/Table";
import api from "../services/api";

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", class_grade: "", division: "" });
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  const loadTeachers = async () => {
    try {
      const response = await api.get(`/admin/teachers?search=${encodeURIComponent(debouncedSearch)}`);
      setTeachers(response.data.teachers);
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to load teachers");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchTeachers = async () => {
      await loadTeachers();
    };
    fetchTeachers();
  }, [debouncedSearch]);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitTeacher = async (event) => {
    event.preventDefault();
    setApiError("");
    if (!form.name || !form.email || !form.class_grade || !form.division) {
      setApiError("Name, email, class and division are required");
      return;
    }

    try {
      if (editingTeacherId) {
        await api.put(`/admin/teachers/${editingTeacherId}`, {
          ...form,
          division: form.division.toUpperCase(),
          password: form.password || undefined,
        });
      } else {
        if (!form.password) {
          setApiError("Password is required for new teacher");
          return;
        }
        await api.post("/admin/add-teacher", { ...form, division: form.division.toUpperCase() });
      }

      setForm({ name: "", email: "", password: "", class_grade: "", division: "" });
      setEditingTeacherId(null);
      await loadTeachers();
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to save teacher");
    }
  };

  const editTeacher = (teacher) => {
    setEditingTeacherId(teacher.id);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      class_grade: teacher.class_grade || "",
      division: teacher.division || "",
    });
  };

  const cancelEdit = () => {
    setEditingTeacherId(null);
    setForm({ name: "", email: "", password: "", class_grade: "", division: "" });
    setApiError("");
  };

  const removeTeacher = async (teacher) => {
    setApiError("");
    const confirmed = window.confirm(`Remove teacher ${teacher.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/admin/teachers/${teacher.id}`);
      await loadTeachers();
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || "Failed to remove teacher";

      if (status === 400) {
        const forceConfirm = window.confirm(`${message}\n\nDo you want to remove this teacher and delete assigned students?`);
        if (forceConfirm) {
          try {
            await api.delete(`/admin/teachers/${teacher.id}?removeStudents=true`);
            await loadTeachers();
            return;
          } catch (forceError) {
            setApiError(forceError.response?.data?.message || "Force remove failed");
            return;
          }
        }
      }

      setApiError(message);
    }
  };

  const teachersBySection = useMemo(() => {
    return teachers.reduce((acc, teacher) => {
      const key = `${teacher.class_grade || "Unassigned"}-${teacher.division || ""}`.replace(/-$/, "");
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(teacher);
      return acc;
    }, {});
  }, [teachers]);

  return (
    <DashboardLayout title="Teachers">
      <div className="panel">
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
      </div>
      <div className="panel">
        <h3>{editingTeacherId ? "Change Teacher Data" : "Add Teacher"}</h3>
        {apiError && <div className="error-text">{apiError}</div>}
        <form className="grid-form" onSubmit={submitTeacher}>
          <input name="name" value={form.name} onChange={onChange} placeholder="Teacher Name" />
          <input name="email" value={form.email} onChange={onChange} placeholder="Teacher Email" type="email" />
          <input
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder={editingTeacherId ? "New Password (optional)" : "Password"}
            type="password"
          />
          <input name="class_grade" value={form.class_grade} onChange={onChange} placeholder="Class (Grade)" />
          <input name="division" value={form.division} onChange={onChange} placeholder="Division" maxLength={3} />
          <button type="submit">{editingTeacherId ? "Save Changes" : "Add Teacher"}</button>
          {editingTeacherId && (
            <button type="button" className="table-action-btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>
      {Object.keys(teachersBySection)
        .sort()
        .map((sectionKey) => {
          const rows = teachersBySection[sectionKey].map((teacher) => [
            teacher.name,
            teacher.email,
            teacher.role,
            `${teacher.class_grade || "-"}-${teacher.division || "-"}`,
            <div className="table-actions" key={`action-${teacher.id}`}>
              <button type="button" className="table-action-btn" onClick={() => editTeacher(teacher)}>
                Change
              </button>
              <button type="button" className="table-action-btn danger" onClick={() => removeTeacher(teacher)}>
                Remove Teacher
              </button>
            </div>,
          ]);

          return (
            <div className="panel" key={sectionKey}>
              <h3>Class Section {sectionKey}</h3>
              <Table headers={["Name", "Email", "Role", "Class", "Actions"]} rows={rows} />
            </div>
          );
        })}
    </DashboardLayout>
  );
};

export default Teachers;

import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, sRes] = await Promise.all([api.get("/admin/teachers"), api.get("/admin/students")]);
      const teachersList = tRes.data.teachers || [];
      const studentsList = sRes.data.students || [];

      setTeachers(teachersList);
      setStudents(studentsList);

      // group students by class string (same format used in backend: classGrade-division)
      const groups = {};
      studentsList.forEach((st) => {
        const cls = st.class || `${st.class_grade || ""}-${st.division || ""}`;
        if (!groups[cls]) groups[cls] = { name: cls, students: [] };
        groups[cls].students.push(st);
      });

      // build classes array with teacher lookup (find teacher matching class_grade+division)
      const classesArr = Object.values(groups).map((g) => {
        const parts = String(g.name).split("-");
        const classGrade = parts[0] || "";
        const division = parts[1] || "";
        const teacher = teachersList.find(
          (tt) => String(tt.class_grade) === String(classGrade) && String(tt.division).toUpperCase() === String(division).toUpperCase()
        );
        return { name: g.name, classGrade, division, teacher: teacher || null, students: g.students };
      });

      setClasses(classesArr);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (className) => {
    // navigate to the class detail page
    navigate(`/admin/classes/${encodeURIComponent(className)}`);
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm("Are you sure you want to remove this student?")) return;
    try {
      await api.delete(`/admin/students/${studentId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove student");
    }
  };

  const openEdit = (student) => {
    setEditingStudent({ ...student });
  };

  const saveEdit = async () => {
    try {
      const s = editingStudent;
      if (!s.name || !s.roll_number || !s.class_grade || !s.division || !s.parent_email) {
        alert("All fields are required");
        return;
      }
      await api.put(`/admin/students/${s.id}`, {
        name: s.name,
        roll_number: s.roll_number,
        class_grade: s.class_grade,
        division: s.division,
        parent_email: s.parent_email,
      });
      setEditingStudent(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update student");
    }
  };

  const classesList = classes.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <DashboardLayout title="Classes">
      <div className="classes-page" style={{ display: "flex", gap: 24 }}>
        <aside style={{ width: 360 }}>
          <h3 style={{ marginTop: 0 }}>Classes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && <div>Loading...</div>}
            {!loading && classesList.length === 0 && <div>No classes found</div>}
            {classesList.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelect(c.name)}
                className="class-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg,#e6f0ff,#f7fbff)",
                  color: "#05264a",
                  border: "1px solid rgba(5,38,74,0.06)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>{c.teacher ? c.teacher.name : "No teacher"}</div>
              </button>
            ))}
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>Select a class</h2>
          <p style={{ color: "#6b7280" }}>Click a class to open its detail page.</p>
        </section>
      </div>

      {editingStudent && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal" style={{ background: "#fff", padding: 20, borderRadius: 8, width: 540 }}>
            <h3>Edit Student</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label>
                Name
                <input value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} />
              </label>
              <label>
                Roll
                <input value={editingStudent.roll_number} onChange={(e) => setEditingStudent({ ...editingStudent, roll_number: e.target.value })} />
              </label>
              <label>
                Class Grade
                <input value={editingStudent.class_grade} onChange={(e) => setEditingStudent({ ...editingStudent, class_grade: e.target.value })} />
              </label>
              <label>
                Division
                <input value={editingStudent.division} onChange={(e) => setEditingStudent({ ...editingStudent, division: e.target.value })} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Parent Email
                <input value={editingStudent.parent_email} onChange={(e) => setEditingStudent({ ...editingStudent, parent_email: e.target.value })} />
              </label>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingStudent(null)}>Cancel</button>
              <button onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Classes;

import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
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
      if (!selected && classesArr.length) setSelected(classesArr[0].name);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (className) => {
    setSelected(className);
    setEditingStudent(null);
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
  const current = classes.find((c) => c.name === selected) || null;

  return (
    <DashboardLayout title="Classes">
      <div className="classes-page" style={{ display: "flex", gap: 24 }}>
        <aside style={{ width: 260 }}>
          <h3 style={{ marginTop: 0 }}>Classes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading && <div>Loading...</div>}
            {!loading && classesList.length === 0 && <div>No classes found</div>}
            {classesList.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelect(c.name)}
                className={`class-item ${selected === c.name ? "active" : ""}`}
                style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, background: selected === c.name ? "#1f6feb" : "transparent", color: selected === c.name ? "#fff" : "inherit", border: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>{c.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{c.teacher ? c.teacher.name : "No teacher"}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>{current ? current.name : "Select a class"}</h2>
          {current && (
            <div>
              <p>Class teacher: {current.teacher ? current.teacher.name : "Not assigned"}</p>

              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Roll</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Parent Email</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Teacher</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {current.students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ padding: 8 }}>{s.name}</td>
                      <td style={{ padding: 8 }}>{s.roll_number}</td>
                      <td style={{ padding: 8 }}>{s.parent_email}</td>
                      <td style={{ padding: 8 }}>{s.teacher ? s.teacher.name : "—"}</td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => openEdit(s)} style={{ marginRight: 8 }}>Change</button>
                        <button onClick={() => handleRemoveStudent(s.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!current && <p>Select a class to view students.</p>}
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

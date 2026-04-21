import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";

const ClassDetail = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className || "");
  const [students, setStudents] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    fetchData();
  }, [className]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, sRes] = await Promise.all([api.get("/admin/teachers"), api.get("/admin/students")]);
      const teachers = tRes.data.teachers || [];
      const allStudents = sRes.data.students || [];

      const matched = allStudents.filter((s) => s.class === decoded || `${s.class_grade}-${s.division}` === decoded);
      setStudents(matched);

      // find teacher for this section
      const parts = String(decoded).split("-");
      const classGrade = parts[0] || "";
      const division = parts[1] || "";
      const t = teachers.find((tt) => String(tt.class_grade) === String(classGrade) && String(tt.division).toUpperCase() === String(division).toUpperCase());
      setTeacher(t || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (id) => {
    if (!confirm("Are you sure you want to remove this student?")) return;
    try {
      await api.delete(`/admin/students/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove student");
    }
  };

  const openEdit = (s) => setEditingStudent({ ...s });

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

  return (
    <DashboardLayout title={`Class: ${decoded}`}>
      <div style={{ padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{decoded}</h2>
            <div style={{ color: "#6b7280", marginTop: 6 }}>Class teacher: {teacher ? teacher.name : "Not assigned"}</div>
          </div>
          <div>
            <button onClick={() => navigate(-1)} style={{ marginRight: 8 }}>Back</button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {loading && <div>Loading...</div>}
          {!loading && students.length === 0 && <div>No students in this class</div>}

          {students.length > 0 && (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Roll</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Parent Email</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: 8 }}>{s.name}</td>
                    <td style={{ padding: 8 }}>{s.roll_number}</td>
                    <td style={{ padding: 8 }}>{s.parent_email}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => openEdit(s)} style={{ marginRight: 8 }}>Change</button>
                      <button onClick={() => handleRemoveStudent(s.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
      </div>
    </DashboardLayout>
  );
};

export default ClassDetail;

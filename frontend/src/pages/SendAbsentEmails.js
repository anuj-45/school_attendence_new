import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";

const SendAbsentEmails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(initialDate);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusByStudentId, setStatusByStudentId] = useState({});

  const allSelected = useMemo(() => {
    if (!students.length) {
      return false;
    }
    return students.every((student) => selectedIds.includes(student.student_id));
  }, [students, selectedIds]);

  const loadAbsentStudents = async (selectedDate) => {
    try {
      setLoading(true);
      setApiError("");
      setSuccess("");
      const response = await api.get("/teacher/absent-students", { params: { date: selectedDate } });
      const absentStudents = response.data.students || [];
      setStudents(absentStudents);
      setSelectedIds(absentStudents.map((student) => student.student_id));
      setStatusByStudentId({});
    } catch (error) {
      setStudents([]);
      setSelectedIds([]);
      setApiError(error.response?.data?.message || "Failed to load absent students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAbsentStudents(date);
  }, [date]);

  const toggleStudent = (studentId) => {
    setSelectedIds((previous) => {
      if (previous.includes(studentId)) {
        return previous.filter((id) => id !== studentId);
      }
      return [...previous, studentId];
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(students.map((student) => student.student_id));
  };

  const sendEmails = async () => {
    if (selectedIds.length === 0) {
      setApiError("Please select at least one absent student");
      return;
    }

    try {
      setSending(true);
      setApiError("");
      setSuccess("");
      setStatusByStudentId((previous) => {
        const next = { ...previous };
        selectedIds.forEach((studentId) => {
          next[studentId] = { tone: "sending", text: "Sending..." };
        });
        return next;
      });

      const response = await api.post("/teacher/send-absent-emails", {
        date,
        student_ids: selectedIds,
      });
      const sentCount = response.data.sentCount || 0;
      const skipped = response.data.skipped || [];
      const results = response.data.results || [];
      const skippedText = skipped.length ? ` Skipped: ${skipped.join(", ")}` : "";
      setSuccess(`Emails sent to ${sentCount} parent(s).${skippedText}`);

      setStatusByStudentId((previous) => {
        const next = { ...previous };
        results.forEach((result) => {
          if (!result.student_id) {
            return;
          }
          let tone = "failed";
          let text = "Failed";
          if (result.status === "sent") {
            tone = "sent";
            text = "Sent";
          } else if (result.status === "skipped") {
            tone = "skipped";
            text = "Skipped";
          }
          next[result.student_id] = {
            tone,
            text,
          };
        });
        return next;
      });
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to send emails");
      setStatusByStudentId((previous) => {
        const next = { ...previous };
        selectedIds.forEach((studentId) => {
          next[studentId] = {
            tone: "failed",
            text: "Failed to send",
          };
        });
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Send Absent Student Emails">
      <div className="panel">
        <div className="panel-top-row">
          <h3>Absent Students</h3>
          <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>

        <label>Date</label>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />

        {apiError && <div className="error-text">{apiError}</div>}
        {success && <div className="success-text">{success}</div>}

        <div className="attendance-list" style={{ marginTop: 12 }}>
          {loading && <p>Loading absent students...</p>}

          {!loading && students.length === 0 && <p>No absent students found for this date.</p>}

          {!loading && students.length > 0 && (
            <>
              <div className="checkbox-row select-all-row">
                <label className="checkbox-label" htmlFor="select-all-students">
                  <input
                    id="select-all-students"
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  Select All
                </label>
              </div>

              {students.map((student) => (
                <div className="checkbox-row" key={student.student_id}>
                  <label className="checkbox-label" htmlFor={`student-${student.student_id}`}>
                    <input
                      id={`student-${student.student_id}`}
                      type="checkbox"
                      checked={selectedIds.includes(student.student_id)}
                      disabled={sending}
                      onChange={() => toggleStudent(student.student_id)}
                    />
                    <span className="student-email-row-content">
                      <span>
                        {student.name} ({student.class_grade}-{student.division} - {student.roll_number})
                      </span>
                      <span className="student-email-id">{student.parent_email}</span>
                    </span>
                    {statusByStudentId[student.student_id] && (
                      <span className={`email-status-badge ${statusByStudentId[student.student_id].tone}`}>
                        {statusByStudentId[student.student_id].text}
                      </span>
                    )}
                  </label>
                </div>
              ))}

              <button type="button" className="submit-btn" onClick={sendEmails} disabled={sending}>
                {sending ? "Sending..." : "Send Email"}
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SendAbsentEmails;

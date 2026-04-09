import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaPaperPlane } from "react-icons/fa6";

import { apiUrl, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell } from "../../components/Shared";

function ManualAttendanceMark() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useSessionProfile("faculty");

  const lecture = location.state?.lecture || null;
  const [students, setStudents] = useState([]);
  const [selectedRolls, setSelectedRolls] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const alreadyMarked = useMemo(() => students.some((student) => student.status_exists), [students]);

  useEffect(() => {
    if (!lecture) {
      navigate("/faculty/manual-attendance", { replace: true });
      return;
    }

    let mounted = true;

    async function loadStudents() {
      setIsLoading(true);
      setErrorText("");
      setSuccessText("");
      try {
        const response = await fetch(apiUrl("/api/faculty/manual-attendance/students"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            branch: lecture.branch,
            semester: lecture.semester,
            section: lecture.section,
            subject: lecture.subject,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;

        if (!response.ok || !payload.success) {
          setStudents([]);
          setErrorText(payload.error || "Unable to load class students.");
          return;
        }

        const nextStudents = payload.students || [];
        setStudents(nextStudents);
        const initiallyPresent = new Set(
          nextStudents.filter((student) => student.status === "Present").map((student) => student.roll_no)
        );
        setSelectedRolls(initiallyPresent);
      } catch {
        if (mounted) {
          setStudents([]);
          setErrorText("Failed to load students.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadStudents();
    return () => {
      mounted = false;
    };
  }, [lecture, navigate]);

  function toggleStudent(rollNo) {
    setSelectedRolls((current) => {
      const next = new Set(current);
      if (next.has(rollNo)) next.delete(rollNo);
      else next.add(rollNo);
      return next;
    });
  }

  function handleToggleEdit() {
    setIsEditing((value) => !value);
    setSuccessText("");
  }

  async function handleSubmit() {
    if (!lecture || isSaving) return;
    setIsSaving(true);
    setErrorText("");
    setSuccessText("");

    try {
      const response = await fetch(apiUrl("/api/faculty/manual-attendance/submit"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          branch: lecture.branch,
          semester: lecture.semester,
          section: lecture.section,
          subject: lecture.subject,
          classroom: lecture.classroom,
          present_rolls: Array.from(selectedRolls),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        setErrorText(payload.error || "Failed to save attendance.");
        return;
      }

      setSuccessText("Attendance marked successfully.");
      setStudents((current) =>
        current.map((student) => ({
          ...student,
          status: selectedRolls.has(student.roll_no) ? "Present" : "Absent",
          status_exists: true,
        }))
      );
      setIsEditing(false);
    } catch {
      setErrorText("Unable to save attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  function canToggle(student) {
    return !student.status_exists || isEditing;
  }

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title={lecture ? `Mark attendance for ${lecture.subject} (${lecture.branch}-${lecture.semester}${lecture.section})` : "Mark Attendance"}
      subtitle="Select present students and submit attendance"
      profile={profile}
    >
      <div className="manual-mark-page">
        {lecture ? (
          <div className="manual-mark-toolbar">
            <div className="manual-mark-toolbar-copy">
              <strong>{lecture.subject}</strong>
              <span>{lecture.branch}-{lecture.semester}{lecture.section} · {lecture.classroom || "Classroom pending"}</span>
            </div>
            {alreadyMarked ? (
              <button type="button" className="manual-edit-btn" onClick={handleToggleEdit}>
                {isEditing ? "Lock Edit" : "Edit Attendance"}
              </button>
            ) : null}
          </div>
        ) : null}

        {errorText ? <div className="manual-alert error">{errorText}</div> : null}
        {successText ? <div className="manual-alert success">{successText}</div> : null}

        <div className="manual-mark-table-wrap">
          <table className="manual-mark-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={(event) => {
                      if (!event.target.checked) {
                        setSelectedRolls(new Set());
                        return;
                      }
                      const allowedRolls = students.filter((student) => canToggle(student)).map((student) => student.roll_no);
                      const next = new Set(selectedRolls);
                      allowedRolls.forEach((roll) => next.add(roll));
                      setSelectedRolls(next);
                    }}
                  />
                </th>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Status</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5}>No students found for this class.</td>
                </tr>
              ) : (
                students.map((student) => {
                  const checked = selectedRolls.has(student.roll_no);
                  const editable = canToggle(student);
                  const statusText = student.status_exists
                    ? student.status === "Present"
                      ? "Already Present"
                      : "Already Absent"
                    : checked
                      ? "Present"
                      : "Absent";
                  const statusClass = checked ? "present" : "absent";

                  return (
                    <tr key={student.roll_no}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!editable}
                          onChange={() => toggleStudent(student.roll_no)}
                        />
                      </td>
                      <td>{student.roll_no}</td>
                      <td>{student.name}</td>
                      <td>
                        <span className={`manual-status-pill ${statusClass}`}>{statusText}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="manual-toggle-btn"
                          onClick={() => toggleStudent(student.roll_no)}
                          disabled={!editable}
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="manual-submit-row">
          <button type="button" className="primary-btn" onClick={handleSubmit} disabled={isSaving || isLoading}>
            <FaPaperPlane /> {isSaving ? "Saving..." : "Mark Attendance"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default ManualAttendanceMark;

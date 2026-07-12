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
      <div className="manual-mark-page grid gap-4">
        {lecture ? (
          <div className="manual-mark-toolbar flex items-center justify-between gap-3.5 rounded-[18px] border border-gray-200 bg-white p-[16px_18px] dark:border-ui-border-dark dark:bg-ui-card-dark">
            <div className="manual-mark-toolbar-copy grid gap-1">
              <strong className="text-base font-extrabold text-gray-800 dark:text-ui-text-dark">{lecture.subject}</strong>
              <span className="text-[0.92rem] font-semibold text-gray-500 dark:text-ui-text-muted-dark">{lecture.branch}-{lecture.semester}{lecture.section} · {lecture.classroom || "Classroom pending"}</span>
            </div>
            {alreadyMarked ? (
              <button
                type="button"
                className="manual-edit-btn cursor-pointer rounded-lg border border-blue-500 bg-white px-3 py-2 font-bold text-blue-500 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark"
                onClick={handleToggleEdit}
              >
                {isEditing ? "Lock Edit" : "Edit Attendance"}
              </button>
            ) : null}
          </div>
        ) : null}

        {errorText ? <div className="manual-alert error rounded-[10px] bg-red-500/[0.14] px-3 py-2.5 font-bold text-red-700">{errorText}</div> : null}
        {successText ? <div className="manual-alert success rounded-[10px] bg-emerald-500/[0.16] px-3 py-2.5 font-bold text-emerald-700">{successText}</div> : null}

        <div className="manual-mark-table-wrap overflow-auto rounded-[18px] border border-gray-200 bg-white dark:border-ui-border-dark dark:bg-ui-card-dark">
          <table className="manual-mark-table w-full border-collapse dark:text-ui-text-dark">
            <thead>
              <tr>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">
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
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">Roll Number</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">Student Name</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">Status</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">Edit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">No students found for this class.</td>
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
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!editable}
                          onChange={() => toggleStudent(student.roll_no)}
                        />
                      </td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{student.roll_no}</td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{student.name}</td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">
                        <span
                          className={`manual-status-pill ${statusClass} inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[0.85rem] font-bold ${
                            statusClass === "present" ? "bg-emerald-500/[0.18] text-emerald-700" : "bg-red-500/[0.16] text-red-700"
                          }`}
                        >
                          {statusText}
                        </span>
                      </td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">
                        <button
                          type="button"
                          className="manual-toggle-btn cursor-pointer rounded-lg border border-blue-500 bg-white px-3 py-2 font-bold text-blue-500 disabled:cursor-not-allowed disabled:opacity-45 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark"
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

        <div className="manual-submit-row flex justify-end">
          <button
            type="button"
            className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleSubmit}
            disabled={isSaving || isLoading}
          >
            <FaPaperPlane /> {isSaving ? "Saving..." : "Mark Attendance"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default ManualAttendanceMark;

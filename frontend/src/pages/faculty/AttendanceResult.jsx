import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCalendarCheck, FaCircleCheck, FaClipboardList, FaUsersViewfinder } from "react-icons/fa6";
import "../../styles/pages/attendance-result.css";

import { useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell, SectionCard } from "../../components/Shared";

function AttendanceResult() {
  const location = useLocation();
  const profile = useSessionProfile("faculty");
  const presentStudents = location.state?.presentStudents || [];
  const presentCount = Number(location.state?.presentCount || presentStudents.length || 0);
  const classId = location.state?.classId || "N/A";
  const normalizedClassId = String(classId || "N/A").replaceAll("_", " ");

  const studentCards = useMemo(
    () =>
      presentStudents.map((studentId) => {
        const raw = String(studentId || "").trim();
        const [rollNo, ...nameParts] = raw.split("_");
        const name = nameParts.join(" ").trim() || raw;
        const initials = name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("") || "?";

        return {
          id: raw,
          rollNo: nameParts.length ? rollNo : "",
          name,
          initials,
        };
      }),
    [presentStudents]
  );

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Attendance Result"
      subtitle="Result summary after an attendance session."
      profile={profile}
    >
      <section className="attendance-result-shell">
        <div className="attendance-result-hero">
          <div className="attendance-result-copy">
            <span className="attendance-result-kicker">
              <FaCalendarCheck /> Attendance Saved
            </span>
            <h2>{presentCount ? "Session completed successfully" : "Session saved with no matches"}</h2>
            <p>
              {presentCount
                ? `${presentCount} student${presentCount === 1 ? "" : "s"} were marked present for ${normalizedClassId}.`
                : "The session finished, but no students were recognized in this run."}
            </p>
            <div className="attendance-result-actions">
              <Link to="/faculty/attendance" className="primary-btn">
                <FaUsersViewfinder /> New Session
              </Link>
              <Link to="/faculty/reports" className="pagination-btn">
                <FaClipboardList /> View Reports
              </Link>
            </div>
          </div>

          <div className="attendance-result-summary-grid">
            <article className="attendance-result-stat success">
              <span>Present Students</span>
              <strong>{presentCount}</strong>
              <small>Recognized and marked</small>
            </article>
            <article className="attendance-result-stat accent">
              <span>Class</span>
              <strong>{normalizedClassId}</strong>
              <small>Session target group</small>
            </article>
            <article className="attendance-result-stat info">
              <span>Status</span>
              <strong>{presentCount ? "Saved" : "No Matches"}</strong>
              <small>Attendance sync complete</small>
            </article>
          </div>
        </div>

        <SectionCard title="Recognized Students">
          {studentCards.length ? (
            <div className="attendance-result-student-grid">
              {studentCards.map((student) => (
                <article key={student.id} className="attendance-result-student-card">
                  <div className="attendance-result-student-avatar">{student.initials}</div>
                  <div className="attendance-result-student-copy">
                    <strong>{student.name}</strong>
                    <span>{student.rollNo || "Recognized student"}</span>
                  </div>
                  <div className="attendance-result-student-badge">
                    <FaCircleCheck />
                    <span>Present</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="attendance-result-empty">
              <FaCircleCheck />
              <strong>No students were recognized</strong>
              <p>Try another live session with better lighting, camera angle, or verified face registrations.</p>
            </div>
          )}
        </SectionCard>
      </section>
    </PageShell>
  );
}

export default AttendanceResult;

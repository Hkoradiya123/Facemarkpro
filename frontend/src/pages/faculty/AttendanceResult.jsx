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
      <section className="attendance-result-shell grid gap-6">
        <div className="attendance-result-hero grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] gap-6 rounded-[28px] border border-slate-400/[0.16] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_26%),linear-gradient(160deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.92)_100%)] p-7 shadow-[0_22px_44px_rgba(15,23,42,0.08)] dark:border-slate-600/90 dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_26%),linear-gradient(165deg,rgba(15,23,42,0.98)_0%,rgba(17,24,39,0.96)_100%)] dark:shadow-[0_26px_50px_rgba(2,6,23,0.34)] max-[992px]:grid-cols-1 max-[640px]:rounded-[22px] max-[640px]:p-[18px]">
          <div className="attendance-result-copy grid content-start gap-3.5">
            <span className="attendance-result-kicker inline-flex w-fit items-center gap-2 rounded-full bg-blue-600/[0.12] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-blue-700 dark:bg-sky-400/[0.14] dark:text-sky-300">
              <FaCalendarCheck /> Attendance Saved
            </span>
            <h2 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[1.02] tracking-[-0.04em] text-slate-900 dark:text-ui-text-dark">
              {presentCount ? "Session completed successfully" : "Session saved with no matches"}
            </h2>
            <p className="m-0 max-w-[56ch] text-base leading-[1.65] text-slate-600 dark:text-ui-text-muted-dark">
              {presentCount
                ? `${presentCount} student${presentCount === 1 ? "" : "s"} were marked present for ${normalizedClassId}.`
                : "The session finished, but no students were recognized in this run."}
            </p>
            <div className="attendance-result-actions mt-2 flex flex-wrap gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
              <Link
                to="/faculty/attendance"
                className="primary-btn inline-flex items-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#4facfe,#00c6fb)] px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(79,172,254,0.22)]"
              >
                <FaUsersViewfinder /> New Session
              </Link>
              <Link
                to="/faculty/reports"
                className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
              >
                <FaClipboardList /> View Reports
              </Link>
            </div>
          </div>

          <div className="attendance-result-summary-grid grid gap-3.5">
            <article className="attendance-result-stat success grid min-h-[118px] content-center gap-1.5 rounded-[22px] border border-slate-400/[0.16] bg-[radial-gradient(circle_at_right_top,rgba(74,222,128,0.16),transparent_38%),rgba(255,255,255,0.78)] p-[18px_20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-600/90 dark:bg-slate-900/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:text-sky-300">Present Students</span>
              <strong className="text-[clamp(1.55rem,2vw,2.2rem)] leading-[1.05] break-words text-slate-900 dark:text-ui-text-dark">{presentCount}</strong>
              <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Recognized and marked</small>
            </article>
            <article className="attendance-result-stat accent grid min-h-[118px] content-center gap-1.5 rounded-[22px] border border-slate-400/[0.16] bg-[radial-gradient(circle_at_right_top,rgba(96,165,250,0.16),transparent_38%),rgba(255,255,255,0.78)] p-[18px_20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-600/90 dark:bg-slate-900/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:text-sky-300">Class</span>
              <strong className="text-[clamp(1.55rem,2vw,2.2rem)] leading-[1.05] break-words text-slate-900 dark:text-ui-text-dark">{normalizedClassId}</strong>
              <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Session target group</small>
            </article>
            <article className="attendance-result-stat info grid min-h-[118px] content-center gap-1.5 rounded-[22px] border border-slate-400/[0.16] bg-[radial-gradient(circle_at_right_top,rgba(251,191,36,0.18),transparent_40%),rgba(255,255,255,0.78)] p-[18px_20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-600/90 dark:bg-slate-900/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500 dark:text-sky-300">Status</span>
              <strong className="text-[clamp(1.55rem,2vw,2.2rem)] leading-[1.05] break-words text-slate-900 dark:text-ui-text-dark">{presentCount ? "Saved" : "No Matches"}</strong>
              <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Attendance sync complete</small>
            </article>
          </div>
        </div>

        <SectionCard title="Recognized Students">
          {studentCards.length ? (
            <div className="attendance-result-student-grid grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              {studentCards.map((student) => (
                <article
                  key={student.id}
                  className="attendance-result-student-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[20px] border border-slate-400/[0.16] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),linear-gradient(165deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.92)_100%)] p-[16px_18px] shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-slate-600/90 dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),linear-gradient(165deg,rgba(15,23,42,0.98)_0%,rgba(17,24,39,0.96)_100%)] dark:shadow-[0_12px_28px_rgba(2,6,23,0.24)] max-[640px]:grid-cols-[auto_minmax(0,1fr)]"
                >
                  <div className="attendance-result-student-avatar grid h-[52px] w-[52px] place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#bfdbfe)] text-[1.05rem] font-extrabold text-blue-700 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))] dark:text-sky-300">
                    {student.initials}
                  </div>
                  <div className="attendance-result-student-copy grid min-w-0 gap-1">
                    <strong className="text-base leading-tight break-words text-slate-900 dark:text-ui-text-dark">{student.name}</strong>
                    <span className="break-words text-[0.9rem] text-slate-500 dark:text-ui-text-muted-dark">{student.rollNo || "Recognized student"}</span>
                  </div>
                  <div className="attendance-result-student-badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/[0.12] px-2.5 py-2 text-xs font-extrabold text-emerald-700 dark:bg-emerald-500/[0.14] dark:text-emerald-300 max-[640px]:col-span-2 max-[640px]:w-fit">
                    <FaCircleCheck />
                    <span>Present</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="attendance-result-empty grid min-h-[220px] place-items-center gap-2.5 rounded-3xl border border-dashed border-slate-400/35 bg-slate-50/72 p-6 text-center dark:border-slate-600/74 dark:bg-slate-900/74">
              <FaCircleCheck className="text-2xl text-blue-400 dark:text-sky-300" />
              <strong className="text-[1.1rem] text-slate-900 dark:text-ui-text-dark">No students were recognized</strong>
              <p className="m-0 max-w-[44ch] leading-[1.55] text-slate-500 dark:text-ui-text-muted-dark">
                Try another live session with better lighting, camera angle, or verified face registrations.
              </p>
            </div>
          )}
        </SectionCard>
      </section>
    </PageShell>
  );
}

export default AttendanceResult;

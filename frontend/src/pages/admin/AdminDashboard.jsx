import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaCamera, FaChartLine, FaUserGraduate, FaUsers } from "react-icons/fa6";

import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SimpleTable, StatGrid } from "../../components/Shared";

function AdminDashboard() {
  const profile = useSessionProfile("admin");
  const [summary, setSummary] = useState({
    facultyCount: 0,
    studentCount: 0,
    attendanceToday: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch(apiUrl("/api/admin/dashboard"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !payload.success) return;

        const stats = payload.stats || {};
        setSummary({
          facultyCount: Number(stats.faculty_count || 0),
          studentCount: Number(stats.student_count || 0),
          attendanceToday: Number(stats.attendance_today || 0),
        });
      } catch {
        // keep fallback summary
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const avgStudentsPerFaculty = useMemo(() => {
    if (!summary.facultyCount) return "0";
    return (summary.studentCount / summary.facultyCount).toFixed(1);
  }, [summary.facultyCount, summary.studentCount]);

  const attendanceCoverage = useMemo(() => {
    if (!summary.studentCount) return "0%";
    return `${Math.min(100, (summary.attendanceToday / summary.studentCount) * 100).toFixed(1)}%`;
  }, [summary.attendanceToday, summary.studentCount]);

  const stats = useMemo(() => ([
    { value: String(summary.facultyCount), label: "Total Faculty", tone: "purple", icon: FaUsers },
    { value: String(summary.studentCount), label: "Total Students", tone: "blue", icon: FaUserGraduate },
    { value: String(summary.attendanceToday), label: "Attendance Today", tone: "green", icon: FaChartLine },
    { value: avgStudentsPerFaculty, label: "Students / Faculty", tone: "amber", icon: FaCamera },
  ]), [avgStudentsPerFaculty, summary.attendanceToday, summary.facultyCount, summary.studentCount]);

  const systemSnapshot = useMemo(() => ([
    {
      label: "Attendance Coverage",
      value: attendanceCoverage,
      note: "Share of student records already marked for today.",
    },
    {
      label: "Faculty Load",
      value: `${avgStudentsPerFaculty} avg`,
      note: "Average student distribution per faculty account.",
    },
    {
      label: "Face Registration Desk",
      value: "Ready",
      note: "Manage registrations, re-registration, and verification from one place.",
    },
  ]), [attendanceCoverage, avgStudentsPerFaculty]);

  const quickActions = [
    {
      to: "/admin/manage-faculty",
      title: "Manage Faculty",
      caption: "Add, edit, and organize faculty records and roles.",
      metric: `${summary.facultyCount} faculty`,
      icon: <FaUsers />,
    },
    {
      to: "/admin/manage-students",
      title: "Manage Students",
      caption: "Update enrollment records, sections, and student information.",
      metric: `${summary.studentCount} students`,
      icon: <FaUserGraduate />,
    },
    {
      to: "/admin/manage-faces",
      title: "Face Registrations",
      caption: "Register new faces, re-register profiles, and monitor coverage.",
      metric: "Registration center",
      icon: <FaCamera />,
    },
    {
      to: "/admin/reports",
      title: "Attendance Reports",
      caption: "Export CSV/PDF reports and inspect institution-wide attendance trends.",
      metric: `${summary.attendanceToday} records today`,
      icon: <FaChartLine />,
    },
  ];

  const areaLinkClassName =
    "admin-overview-table-link inline-flex min-w-[72px] items-center justify-center rounded-full bg-blue-500/[0.12] px-3 py-2 text-[0.85rem] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";

  const areaRows = [
    [
      "Faculty Records",
      summary.facultyCount,
      "Profiles, departments, and admin controls",
      <Link key="faculty" className={areaLinkClassName} to="/admin/manage-faculty">Open</Link>,
    ],
    [
      "Student Directory",
      summary.studentCount,
      "Enrollment, sections, and class mapping",
      <Link key="students" className={areaLinkClassName} to="/admin/manage-students">Open</Link>,
    ],
    [
      "Face Registration",
      "Live",
      "Register, review, and refresh face datasets",
      <Link key="faces" className={areaLinkClassName} to="/admin/manage-faces">Open</Link>,
    ],
    [
      "Reporting Center",
      summary.attendanceToday,
      "Daily exports and institution-wide summaries",
      <Link key="reports" className={areaLinkClassName} to="/admin/reports">Open</Link>,
    ],
  ];

  return (
    <PageShell
      variant="admin"
      nav={adminNav}
      title="Admin Overview"
      subtitle="Keep an eye on institutional activity, people, and attendance operations from one place."
      profile={profile}
    >
      <section className="admin-overview-hero grid grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)] gap-[22px] rounded-[26px] border border-slate-400/[0.26] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(155deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-[26px] shadow-[0_20px_44px_rgba(15,23,42,0.08)] max-[992px]:grid-cols-1 dark:border-ui-border-dark dark:bg-ui-card-dark">
        <div className="admin-overview-hero-copy grid content-start gap-3.5">
          <span className="admin-overview-kicker inline-flex w-fit items-center rounded-full bg-blue-600/10 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-blue-700">Control Center</span>
          <h2 className="m-0 text-[clamp(1.9rem,3vw,2.7rem)] leading-[1.05] tracking-[-0.04em] text-slate-900 dark:text-ui-text-dark">Institution snapshot for today</h2>
          <p className="m-0 max-w-[58ch] text-base leading-[1.65] text-slate-600 dark:text-ui-text-muted-dark">
            Review platform scale, attendance activity, and core admin actions without jumping between pages.
          </p>
          <div className="admin-overview-chip-row flex flex-wrap gap-2.5">
            <span className="admin-overview-chip inline-flex items-center rounded-full border border-slate-400/30 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark">Live counts</span>
            <span className="admin-overview-chip inline-flex items-center rounded-full border border-slate-400/30 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark">Quick actions</span>
            <span className="admin-overview-chip inline-flex items-center rounded-full border border-slate-400/30 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark">Admin-ready workflow</span>
          </div>
        </div>
        <div className="admin-overview-hero-metrics grid gap-3.5">
          <article className="admin-overview-metric-card grid min-h-[118px] content-center gap-1.5 rounded-2xl border border-slate-400/[0.24] bg-white/76 p-[18px_20px] shadow-[inset_0_1px_rgba(255,255,255,0.7)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark">
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Attendance Logged</span>
            <strong className="text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.05] text-slate-900 dark:text-ui-text-dark">{summary.attendanceToday}</strong>
            <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Records captured today</small>
          </article>
          <article className="admin-overview-metric-card grid min-h-[118px] content-center gap-1.5 rounded-2xl border border-slate-400/[0.24] bg-white/76 p-[18px_20px] shadow-[inset_0_1px_rgba(255,255,255,0.7)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark">
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Coverage</span>
            <strong className="text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.05] text-slate-900 dark:text-ui-text-dark">{attendanceCoverage}</strong>
            <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Based on current student count</small>
          </article>
          <article className="admin-overview-metric-card grid min-h-[118px] content-center gap-1.5 rounded-2xl border border-slate-400/[0.24] bg-white/76 p-[18px_20px] shadow-[inset_0_1px_rgba(255,255,255,0.7)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark">
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Avg Faculty Load</span>
            <strong className="text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.05] text-slate-900 dark:text-ui-text-dark">{avgStudentsPerFaculty}</strong>
            <small className="text-[0.9rem] text-slate-600 dark:text-ui-text-muted-dark">Students per faculty member</small>
          </article>
        </div>
      </section>

      <div className="admin-overview-stats my-6 [&_.stats-grid]:mb-0">
        <StatGrid stats={stats} />
      </div>

      <div className="content-grid two admin-overview-grid grid grid-cols-2 gap-5 max-[992px]:grid-cols-1">
        <SectionCard title="Quick Actions" className="admin-overview-card rounded-[22px]">
          <div className="admin-overview-actions grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="admin-overview-action-card grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 rounded-[18px] border border-slate-200 bg-[linear-gradient(165deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-[16px_18px] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_28px_rgba(37,99,235,0.12)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark"
              >
                <div className="admin-overview-action-icon grid h-[46px] w-[46px] place-items-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe_0%,#bfdbfe_100%)] text-lg text-blue-700">{action.icon}</div>
                <div className="admin-overview-action-copy grid min-w-0 gap-1.5">
                  <strong className="text-base leading-tight text-slate-900 dark:text-ui-text-dark">{action.title}</strong>
                  <p className="m-0 text-[0.92rem] leading-[1.5] text-slate-500 dark:text-ui-text-muted-dark">{action.caption}</p>
                  <span className="text-[0.84rem] font-bold text-blue-600 dark:text-blue-400">{action.metric}</span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="System Snapshot" className="admin-overview-card rounded-[22px]">
          <div className="admin-overview-snapshot-list grid gap-3.5">
            {systemSnapshot.map((item) => (
              <article
                key={item.label}
                className="admin-overview-snapshot-item grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 rounded-[18px] border border-slate-200 bg-slate-50 p-[16px_18px] dark:border-ui-border-dark dark:bg-ui-card-muted-dark"
              >
                <div>
                  <strong className="text-[0.98rem] text-slate-900 dark:text-ui-text-dark">{item.label}</strong>
                  <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-slate-500 dark:text-ui-text-muted-dark">{item.note}</p>
                </div>
                <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-blue-500/[0.12] px-3 py-2.5 text-[0.9rem] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">{item.value}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Administration Areas"
        className="admin-overview-card admin-overview-areas-card mt-5 rounded-[22px] [&_.simple-table]:border-separate [&_.simple-table]:border-spacing-y-2.5 [&_.simple-table]:bg-transparent [&_.simple-table_th]:border-b-0 [&_.simple-table_th]:bg-transparent [&_.simple-table_td]:border-y [&_.simple-table_td]:border-[#e2e8f0] [&_.simple-table_td]:bg-white [&_.simple-table_tbody_tr:hover_td]:bg-[#f8fafc] [&_.simple-table_tbody_tr_td:first-child]:rounded-l-[14px] [&_.simple-table_tbody_tr_td:first-child]:border-l [&_.simple-table_tbody_tr_td:last-child]:rounded-r-[14px] [&_.simple-table_tbody_tr_td:last-child]:border-r [&_.table-wrap]:overflow-visible"
      >
        <SimpleTable
          columns={["Area", "Live Count", "Purpose", "Action"]}
          rows={areaRows}
        />
      </SectionCard>
    </PageShell>
  );
}

export default AdminDashboard;

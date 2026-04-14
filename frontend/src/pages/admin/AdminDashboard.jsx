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

  const areaRows = [
    [
      "Faculty Records",
      summary.facultyCount,
      "Profiles, departments, and admin controls",
      <Link key="faculty" className="admin-overview-table-link" to="/admin/manage-faculty">Open</Link>,
    ],
    [
      "Student Directory",
      summary.studentCount,
      "Enrollment, sections, and class mapping",
      <Link key="students" className="admin-overview-table-link" to="/admin/manage-students">Open</Link>,
    ],
    [
      "Face Registration",
      "Live",
      "Register, review, and refresh face datasets",
      <Link key="faces" className="admin-overview-table-link" to="/admin/manage-faces">Open</Link>,
    ],
    [
      "Reporting Center",
      summary.attendanceToday,
      "Daily exports and institution-wide summaries",
      <Link key="reports" className="admin-overview-table-link" to="/admin/reports">Open</Link>,
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
      <section className="admin-overview-hero">
        <div className="admin-overview-hero-copy">
          <span className="admin-overview-kicker">Control Center</span>
          <h2>Institution snapshot for today</h2>
          <p>
            Review platform scale, attendance activity, and core admin actions without jumping between pages.
          </p>
          <div className="admin-overview-chip-row">
            <span className="admin-overview-chip">Live counts</span>
            <span className="admin-overview-chip">Quick actions</span>
            <span className="admin-overview-chip">Admin-ready workflow</span>
          </div>
        </div>
        <div className="admin-overview-hero-metrics">
          <article className="admin-overview-metric-card">
            <span>Attendance Logged</span>
            <strong>{summary.attendanceToday}</strong>
            <small>Records captured today</small>
          </article>
          <article className="admin-overview-metric-card">
            <span>Coverage</span>
            <strong>{attendanceCoverage}</strong>
            <small>Based on current student count</small>
          </article>
          <article className="admin-overview-metric-card">
            <span>Avg Faculty Load</span>
            <strong>{avgStudentsPerFaculty}</strong>
            <small>Students per faculty member</small>
          </article>
        </div>
      </section>

      <div className="admin-overview-stats">
        <StatGrid stats={stats} />
      </div>

      <div className="content-grid two admin-overview-grid">
        <SectionCard title="Quick Actions" className="admin-overview-card">
          <div className="admin-overview-actions">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className="admin-overview-action-card">
                <div className="admin-overview-action-icon">{action.icon}</div>
                <div className="admin-overview-action-copy">
                  <strong>{action.title}</strong>
                  <p>{action.caption}</p>
                  <span>{action.metric}</span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="System Snapshot" className="admin-overview-card">
          <div className="admin-overview-snapshot-list">
            {systemSnapshot.map((item) => (
              <article key={item.label} className="admin-overview-snapshot-item">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.note}</p>
                </div>
                <span>{item.value}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Administration Areas" className="admin-overview-card admin-overview-areas-card">
        <SimpleTable
          columns={["Area", "Live Count", "Purpose", "Action"]}
          rows={areaRows}
        />
      </SectionCard>
    </PageShell>
  );
}

export default AdminDashboard;

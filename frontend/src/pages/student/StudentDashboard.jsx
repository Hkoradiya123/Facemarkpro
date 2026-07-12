import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarDays, FaChartLine, FaClock, FaCircleCheck, FaCircleXmark,
  FaBook, FaUserCheck, FaArrowRight
} from "react-icons/fa6";

import { apiUrl, getStoredAuthUser, useSessionProfile } from "../../utils/auth";
import { studentNav, todaysClasses, recentAttendance, weeklyTimetable } from "../../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, DashboardSkeleton } from "../../components/Shared";

const DEFAULT_WEEKLY_HEADERS = ["09:00", "10:00", "11:00", "12:00", "02:00"];

function StudentDashboard() {
  const profile = useSessionProfile("student");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todayClasses: [],
    upcomingClasses: [],
    attendanceSummary: { present: 0, absent: 0, total: 0 },
    recentAttendance: [],
    weeklyHeaders: DEFAULT_WEEKLY_HEADERS,
    weeklyTimetable: [],
  });
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const webResponse = await fetch(apiUrl("/api/student/dashboard"), {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (webResponse.ok) {
          const data = await webResponse.json();
          const summary = data.attendanceSummary || { present: 0, absent: 0, total: 0 };
          setDashboardData({
            todayClasses: data.todayClasses || data.todayAttendance || [],
            upcomingClasses: data.upcomingClasses || [],
            attendanceSummary: summary,
            recentAttendance: data.recentAttendance || [],
            weeklyHeaders: data.weeklyHeaders || DEFAULT_WEEKLY_HEADERS,
            weeklyTimetable: data.weeklyTimetable || [],
          });
          setUsingFallbackData(false);
          return;
        }

        setUsingFallbackData(true);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setUsingFallbackData(true);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton variant="student" />;
  }

  const storedUser = getStoredAuthUser();
  const displayName = storedUser?.name || storedUser?.roll_no || "Student";
  const displayMeta = storedUser?.branch ? `${storedUser.branch} / ${storedUser.semester || "Semester"}` : "Student";

  const effectiveRecentAttendance = dashboardData.recentAttendance.length > 0 ? dashboardData.recentAttendance : recentAttendance;
  const effectiveTodayClasses = dashboardData.todayClasses.length > 0 ? dashboardData.todayClasses : todaysClasses;
  const effectiveWeeklyTimetable = dashboardData.weeklyTimetable.length > 0 ? dashboardData.weeklyTimetable : weeklyTimetable;
  const effectiveWeeklyHeaders = dashboardData.weeklyHeaders.length > 0 ? dashboardData.weeklyHeaders : DEFAULT_WEEKLY_HEADERS;

  const derivedPresent = dashboardData.attendanceSummary.present || effectiveRecentAttendance.filter((row) => String(row.status).toLowerCase() === "present").length;
  const derivedAbsent = dashboardData.attendanceSummary.absent || effectiveRecentAttendance.filter((row) => String(row.status).toLowerCase() === "absent").length;
  const derivedTotal = dashboardData.attendanceSummary.total || (derivedPresent + derivedAbsent);
  const derivedPercentage = derivedTotal > 0 ? Math.round((derivedPresent / derivedTotal) * 100) : 0;

  const enhancedStats = [
    {
      label: "Present",
      value: derivedPresent,
      tone: "success",
    },
    {
      label: "Absent",
      value: derivedAbsent,
      tone: "danger",
    },
    {
      label: "Total Classes",
      value: derivedTotal,
      tone: "info",
    },
    {
      label: "Attendance %",
      value: derivedPercentage,
      tone: "warning",
    },
  ];

  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title={`Welcome back, ${displayName}!`}
      subtitle="Here's your attendance overview and schedule."
      profile={{
        avatar: displayName.charAt(0).toUpperCase(),
        name: displayName,
        meta: displayMeta,
      }}
    >
      <StatGrid stats={enhancedStats} />
      {usingFallbackData ? (
        <p className="dashboard-data-note mt-2 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">Showing fallback sample data because live dashboard API data is unavailable right now.</p>
      ) : null}

      <div className="student-dashboard-grid grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 py-6 max-[1024px]:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] max-[1024px]:gap-5 max-[768px]:grid-cols-1 max-[768px]:gap-4 max-[768px]:py-4">
        {/* Weekly Timetable */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-blue-700">
              <FaBook />
              <span>Weekly Timetable</span>
            </span>
          }
          className="student-card timetable-card col-span-full transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <p className="timetable-mobile-hint mb-2 hidden text-[11px] text-ui-text-muted max-[768px]:block dark:text-ui-text-muted-dark">Swipe left/right to view all columns.</p>
          <div className="timetable-wrap overflow-x-auto rounded-lg">
            <table className="modern-timetable min-w-[860px] max-[768px]:min-w-[680px] w-full max-w-full border-collapse overflow-hidden rounded-lg bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:bg-ui-card-dark">
              <thead className="bg-[linear-gradient(135deg,#1976d2_0%,#1565c0_100%)] text-white">
                <tr>
                  <th className="border-r border-white/10 p-[14px_12px] max-[768px]:p-[9px_7px] text-center text-[13px] max-[768px]:text-[11px] font-semibold uppercase tracking-[0.5px] leading-tight whitespace-nowrap">Day</th>
                  {effectiveWeeklyHeaders.map((slot) => (
                    <th key={`slot-${slot}`} className="border-r border-white/10 p-[14px_12px] max-[768px]:p-[9px_7px] text-center text-[13px] max-[768px]:text-[11px] font-semibold uppercase tracking-[0.5px] leading-tight whitespace-nowrap last:border-r-0">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {effectiveWeeklyTimetable && effectiveWeeklyTimetable.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => {
                      const kind = cellIdx === 0 ? "day-cell" : cell === "Break" ? "break-cell" : "class-cell";
                      return (
                        <td
                          key={`${rowIdx}-${cellIdx}`}
                          className={`${kind} border border-slate-200 p-3 max-[768px]:p-[9px_7px] text-center text-[13px] max-[768px]:text-[11px] font-normal leading-tight break-words transition-colors duration-200 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark ${
                            kind === "day-cell"
                              ? "sticky left-0 z-[2] border-r-2 border-r-blue-700 bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] font-semibold text-blue-700 max-[768px]:min-w-[88px] dark:bg-blue-600/10 dark:text-blue-400"
                              : kind === "break-cell"
                                ? "bg-[linear-gradient(135deg,#f0fdf4_0%,#f0fdf4_100%)] font-medium italic text-emerald-600"
                                : "bg-white font-medium text-ui-text dark:bg-ui-card-dark dark:text-ui-text-dark"
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Recent Attendance */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-blue-700">
              <FaChartLine />
              <span>Recent Attendance</span>
            </span>
          }
          action={
            <Link
              to="/student/attendance"
              className="view-all-link rounded-md px-2 py-1 text-[13px] font-semibold text-blue-700 no-underline transition-all duration-200 hover:translate-x-0.5 hover:bg-blue-700/10"
            >
              View All
            </Link>
          }
          className="student-card attendance-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          {effectiveRecentAttendance && effectiveRecentAttendance.length > 0 ? (
            <SimpleTable
              columns={["Date", "Subject", "Status"]}
              rows={effectiveRecentAttendance.slice(0, 5).map((row) => [
                row.date,
                row.subject,
                <span
                  key={row.date}
                  className={`attendance-badge ${row.status === "Present" ? "present" : "absent"} inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-300 ${
                    row.status === "Present"
                      ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-700 hover:border-emerald-400/50 hover:bg-emerald-400/[0.15]"
                      : "border border-red-400/30 bg-red-400/10 text-red-600 hover:border-red-400/50 hover:bg-red-400/[0.15]"
                  }`}
                >
                  {row.status === "Present" ? <FaCircleCheck /> : <FaCircleXmark />}
                  {row.status}
                </span>,
              ])}
            />
          ) : (
            <div className="empty-state flex flex-col items-center justify-center gap-3 p-[48px_24px] text-center text-ui-text-muted dark:text-ui-text-muted-dark [&>svg]:mb-3 [&>svg]:opacity-40">
              <FaChartLine size={48} />
              <p className="m-0 text-sm">No attendance records available</p>
            </div>
          )}
        </SectionCard>

        {/* Today's Schedule */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-blue-700">
              <FaCalendarDays />
              <span>Today's Schedule</span>
            </span>
          }
          className="student-card schedule-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          {effectiveTodayClasses && effectiveTodayClasses.length > 0 ? (
            <div className="schedule-timeline flex flex-col gap-4">
              {effectiveTodayClasses.map((item) => (
                <div
                  key={`${item.time}-${item.subject}`}
                  className="timeline-item modern relative rounded-[10px] border-l-[3px] border-l-transparent bg-[linear-gradient(135deg,rgba(25,118,210,0.05)_0%,rgba(25,118,210,0.02)_100%)] p-[12px_12px_12px_14px] before:absolute before:left-0 before:top-1/2 before:h-[60%] before:w-[3px] before:-translate-y-1/2 before:rounded-[2px] before:bg-[linear-gradient(180deg,#1976d2_0%,rgba(25,118,210,0.3)_100%)] before:content-['']"
                >
                  <div className="flex gap-3">
                    <div className="timeline-marker relative z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1976d2_0%,#1565c0_100%)] text-white shadow-[0_4px_12px_rgba(25,118,210,0.25)]">
                      <FaClock size={14} />
                    </div>
                    <div className="timeline-content relative z-[2] flex min-w-0 flex-1 flex-col gap-1">
                      <div className="timeline-time text-xs font-semibold uppercase tracking-[0.5px] text-blue-700">{item.time}</div>
                      <div className="timeline-subject text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{item.subject}</div>
                      <div className="timeline-faculty flex items-center gap-1 text-[13px] text-ui-text-muted dark:text-ui-text-muted-dark">
                        <FaUserCheck size={12} /> Prof. {item.faculty}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state flex flex-col items-center justify-center gap-3 p-[48px_24px] text-center text-ui-text-muted dark:text-ui-text-muted-dark [&>svg]:mb-3 [&>svg]:opacity-40">
              <FaCalendarDays size={48} />
              <p className="m-0 text-sm">No classes scheduled for today</p>
            </div>
          )}
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-blue-700">
              <FaArrowRight />
              <span>Quick Actions</span>
            </span>
          }
          className="student-card actions-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="quick-actions grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 max-[768px]:grid-cols-2 max-[560px]:grid-cols-1">
            <Link
              to="/student/attendance"
              className="action-button flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-[16px_12px] text-center text-[13px] font-semibold text-ui-text no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:text-blue-700 hover:shadow-[0_8px_16px_rgba(25,118,210,0.12)] active:translate-y-0 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08] [&>svg]:text-[18px]"
            >
              <FaChartLine /> View Attendance
            </Link>
            <Link
              to="/student/profile"
              className="action-button flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-[16px_12px] text-center text-[13px] font-semibold text-ui-text no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:text-blue-700 hover:shadow-[0_8px_16px_rgba(25,118,210,0.12)] active:translate-y-0 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08] [&>svg]:text-[18px]"
            >
              <FaUserCheck /> My Profile
            </Link>
            <Link
              to="/student/change-password"
              className="action-button flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-[16px_12px] text-center text-[13px] font-semibold text-ui-text no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:text-blue-700 hover:shadow-[0_8px_16px_rgba(25,118,210,0.12)] active:translate-y-0 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08] [&>svg]:text-[18px]"
            >
              <FaUserCheck /> Change Password
            </Link>
          </div>
        </SectionCard>

        {/* Attendance Summary Chart */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-blue-700">
              <FaChartLine />
              <span>Attendance Overview</span>
            </span>
          }
          className="student-card summary-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="attendance-summary-widget grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 max-[768px]:grid-cols-1">
            <div className="summary-stat flex items-center gap-3 rounded-xl border border-blue-700/10 bg-[linear-gradient(135deg,rgba(25,118,210,0.05)_0%,rgba(25,118,210,0.02)_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(25,118,210,0.08)_0%,rgba(25,118,210,0.04)_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-blue-600/20 dark:bg-blue-600/[0.08]">
              <div className="summary-icon success flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#34d399_0%,#10b981_100%)] text-2xl text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <FaCircleCheck />
              </div>
              <div className="summary-text flex flex-col gap-0.5">
                <strong className="text-lg leading-none text-ui-text dark:text-ui-text-dark">{derivedPresent}</strong>
                <small className="text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">Classes Attended</small>
              </div>
            </div>
            <div className="summary-stat flex items-center gap-3 rounded-xl border border-blue-700/10 bg-[linear-gradient(135deg,rgba(25,118,210,0.05)_0%,rgba(25,118,210,0.02)_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(25,118,210,0.08)_0%,rgba(25,118,210,0.04)_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-blue-600/20 dark:bg-blue-600/[0.08]">
              <div className="summary-icon danger flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f87171_0%,#ef4444_100%)] text-2xl text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <FaCircleXmark />
              </div>
              <div className="summary-text flex flex-col gap-0.5">
                <strong className="text-lg leading-none text-ui-text dark:text-ui-text-dark">{derivedAbsent}</strong>
                <small className="text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">Classes Missed</small>
              </div>
            </div>
            <div className="summary-stat flex items-center gap-3 rounded-xl border border-blue-700/10 bg-[linear-gradient(135deg,rgba(25,118,210,0.05)_0%,rgba(25,118,210,0.02)_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(25,118,210,0.08)_0%,rgba(25,118,210,0.04)_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-blue-600/20 dark:bg-blue-600/[0.08]">
              <div className="summary-icon info flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#60a5fa_0%,#3b82f6_100%)] text-2xl text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <FaBook />
              </div>
              <div className="summary-text flex flex-col gap-0.5">
                <strong className="text-lg leading-none text-ui-text dark:text-ui-text-dark">{derivedPercentage}%</strong>
                <small className="text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">Attendance Rate</small>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentDashboard;

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";

import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../../utils/auth";
import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL } from "../../utils/constants";
import { normalizeFacultyLayout, getWidgetSizeClass } from "../../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../../components/Shared";

function StudentDashboard() {
  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Welcome back, Rahul!"
      subtitle="Here's what's happening today."
      profile={{ avatar: "S", name: "Rahul Kumar", meta: "CSE / Semester 6" }}
    >
      <StatGrid stats={studentStats} />
      <div className="content-grid two">
        <SectionCard title="Today's Schedule">
          <div className="timeline-list">
            {todaysClasses.map((item) => (
              <div key={`${item.time}-${item.subject}`} className="timeline-item">
                <span className="timeline-time">{item.time}</span>
                <strong>{item.subject}</strong>
                <small>Prof. {item.faculty}</small>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Recent Attendance" action={<Link to="/student/attendance">View All</Link>}>
          <SimpleTable
            columns={["Date", "Subject", "Status"]}
            rows={recentAttendance.map((row) => [
              row.date,
              row.subject,
              <span key={row.date} className={`badge ${row.status === "Present" ? "present" : "absent"}`}>
                {row.status}
              </span>,
            ])}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentDashboard;

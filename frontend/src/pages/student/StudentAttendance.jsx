import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";

import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../../utils/auth";
import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL } from "../../utils/constants";
import { normalizeFacultyLayout, getWidgetSizeClass } from "../../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../../components/Shared";

function StudentAttendance() {
  const profile = useSessionProfile("student");
  const overall = useMemo(
    () => [
      { subject: "DBMS", attendance: "90%", trend: "Strong" },
      { subject: "Python", attendance: "85%", trend: "Improving" },
      { subject: "Maths", attendance: "78%", trend: "Watch" },
      { subject: "SQL Lab", attendance: "95%", trend: "Excellent" },
    ],
    []
  );

  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Attendance Overview"
      subtitle="Subject-wise attendance, recent records, and semester summary."
      profile={profile}
    >
      <StatGrid
        stats={[
          { value: "87%", label: "Semester", tone: "blue" },
          { value: "95%", label: "Best Subject", tone: "green" },
          { value: "78%", label: "Needs Focus", tone: "amber" },
        ]}
      />
      <div className="content-grid two grid grid-cols-2 gap-6 max-[992px]:grid-cols-1">
        <SectionCard title="By Subject">
          <SimpleTable
            columns={["Subject", "Attendance", "Trend"]}
            rows={overall.map((row) => [row.subject, row.attendance, row.trend])}
          />
        </SectionCard>
        <SectionCard title="Recent Records">
          <SimpleTable
            columns={["Date", "Subject", "Status"]}
            rows={recentAttendance.map((row) => [row.date, row.subject, row.status])}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentAttendance;

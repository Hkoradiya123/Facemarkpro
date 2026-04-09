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

function FacultyStudents() {
  const profile = useSessionProfile("faculty");
  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Students"
      subtitle="Faculty-side student directory."
      profile={profile}
      actions={<button className="primary-btn">Export CSV</button>}
    >
      <SectionCard title="Class Roster">
        <SimpleTable
          columns={["Roll No", "Name", "Branch", "Semester", "Section"]}
          rows={facultyStudents.map((student) => [
            student.rollNo,
            student.name,
            student.branch,
            student.semester,
            student.section,
          ])}
        />
      </SectionCard>
    </PageShell>
  );
}

export default FacultyStudents;

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

function StudentChangePassword() {
  const profile = useSessionProfile("student");
  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Change Password"
      subtitle="Recreated as a clean card form inside the student shell."
      profile={profile}
    >
      <SectionCard title="Security">
        <FormGrid
          fields={[
            { label: "Current Password", type: "password" },
            { label: "New Password", type: "password" },
            { label: "Confirm Password", type: "password" },
          ]}
          action="Update Password"
        />
      </SectionCard>
    </PageShell>
  );
}

export default StudentChangePassword;

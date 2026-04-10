import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";

import { getDashboardPath, getStoredAuthRole } from "./utils/auth";
import { THEME_KEY } from "./utils/constants";
import { RequireAdminAuth, RequireFacultyAuth } from "./components/Shared";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentProfile from "./pages/student/StudentProfile";
import StudentChangePassword from "./pages/student/StudentChangePassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManageFaculty from "./pages/admin/AdminManageFaculty";
import AdminManageStudents from "./pages/admin/AdminManageStudents";
import AdminManageFaces from "./pages/admin/AdminManageFaces";
import AdminReports from "./pages/admin/AdminReports";
import AdminTablePage from "./pages/admin/AdminTablePage";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyWidgetCard from "./pages/faculty/FacultyWidgetCard";
import MiniMetricList from "./pages/MiniMetricList";
import BarSpark from "./pages/BarSpark";
import MonthlyTrendChart from "./pages/MonthlyTrendChart";
import AttendanceOverviewChart from "./pages/AttendanceOverviewChart";
import AttendanceHeatmapChart from "./pages/AttendanceHeatmapChart";
import MiniCalendarWidget from "./pages/MiniCalendarWidget";
import FacultyAttendance from "./pages/faculty/FacultyAttendance";
import ManualAttendance from "./pages/faculty/ManualAttendance";
import ManualAttendanceSelect from "./pages/faculty/ManualAttendanceSelect";
import ManualAttendanceMark from "./pages/faculty/ManualAttendanceMark";
import AttendanceResult from "./pages/faculty/AttendanceResult";
import FacultyStudents from "./pages/faculty/FacultyStudents";
import FacultyReports from "./pages/faculty/FacultyReports";
import FacultyProfile from "./pages/faculty/FacultyProfile";
import FaceRegistrationsSummary from "./pages/faculty/FaceRegistrationsSummary";
import FacultyFormPage from "./pages/faculty/FacultyFormPage";
import LoginPage from "./pages/LoginPage";


function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const authRole = getStoredAuthRole();
  const defaultRoute = getDashboardPath(authRole);

  useEffect(() => {
    const onThemeChange = (event) => {
      const nextTheme = event?.detail?.theme;
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
      }
    };

    window.addEventListener("theme-change", onThemeChange);
    return () => window.removeEventListener("theme-change", onThemeChange);
  }, []);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={<LoginPage theme={theme} setTheme={setTheme} defaultRoute={defaultRoute} />} />
      <Route path="/multilogin" element={<LoginPage theme={theme} setTheme={setTheme} defaultRoute={defaultRoute} />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdminAuth>
            <AdminDashboard />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/admin/manage-faculty"
        element={
          <RequireAdminAuth>
            <AdminManageFaculty />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/admin/manage-students"
        element={
          <RequireAdminAuth>
            <AdminManageStudents />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/admin/manage-faces"
        element={
          <RequireAdminAuth>
            <AdminManageFaces />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAdminAuth>
            <AdminReports />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/faculty/dashboard"
        element={
          <RequireFacultyAuth>
            <FacultyDashboard />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/attendance"
        element={
          <RequireFacultyAuth>
            <FacultyAttendance />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/attendance-result"
        element={
          <RequireFacultyAuth>
            <AttendanceResult />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/manual-attendance"
        element={
          <RequireFacultyAuth>
            <ManualAttendance />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/manual-attendance/select"
        element={
          <RequireFacultyAuth>
            <ManualAttendanceSelect />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/manual-attendance/mark"
        element={
          <RequireFacultyAuth>
            <ManualAttendanceMark />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/students"
        element={
          <RequireFacultyAuth>
            <FacultyStudents />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/reports"
        element={
          <RequireFacultyAuth>
            <FacultyReports />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/profile"
        element={
          <RequireFacultyAuth>
            <FacultyProfile />
          </RequireFacultyAuth>
        }
      />
      <Route
        path="/faculty/face-summary"
        element={
          <RequireFacultyAuth>
            <FaceRegistrationsSummary />
          </RequireFacultyAuth>
        }
      />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/attendance" element={<StudentAttendance />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/student/change-password" element={<StudentChangePassword />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default App;

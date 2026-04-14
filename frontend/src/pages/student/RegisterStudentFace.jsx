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

function RegisterStudentFace() {
  const profile = useSessionProfile("student");
  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Register Face"
      subtitle="Face registration screen styled to match the current student UI."
      profile={profile}
    >
      <div className="content-grid two">
        <SectionCard title="Camera Preview">
          <div className="camera-box">Camera feed placeholder</div>
        </SectionCard>
        <SectionCard title="Instructions">
          <ul className="plain-list">
            <li>Keep your face centered inside the frame.</li>
            <li>Use a bright area with minimal background shadows.</li>
            <li>Capture multiple angles for better recognition.</li>
          </ul>
          <button className="primary-btn" type="button">
            Start Registration
          </button>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default RegisterStudentFace;

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
      <div className="content-grid two grid grid-cols-2 gap-6 max-[992px]:grid-cols-1">
        <SectionCard title="Camera Preview">
          <div className="camera-box grid min-h-[260px] place-items-center rounded-[18px] border-2 border-dashed border-[#4facfe]/45 bg-[linear-gradient(135deg,rgba(79,172,254,0.08),rgba(0,198,251,0.12))] font-semibold text-blue-600">
            Camera feed placeholder
          </div>
        </SectionCard>
        <SectionCard title="Instructions">
          <ul className="plain-list mb-[18px] flex flex-col gap-2.5 pl-[18px]">
            <li>Keep your face centered inside the frame.</li>
            <li>Use a bright area with minimal background shadows.</li>
            <li>Capture multiple angles for better recognition.</li>
          </ul>
          <button
            className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
            type="button"
          >
            Start Registration
          </button>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default RegisterStudentFace;

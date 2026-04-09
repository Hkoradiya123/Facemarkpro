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

function StudentProfile() {
  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Student Profile"
      subtitle="Profile information matching the student dashboard style."
      profile={{ avatar: "S", name: "Rahul Kumar", meta: "rahul@example.com" }}
    >
      <div className="content-grid two">
        <SectionCard title="Basic Info">
          <ProfileFields
            items={[
              ["Name", "Rahul Kumar"],
              ["Roll No", "22CS101"],
              ["Branch", "Computer Science"],
              ["Semester", "6"],
              ["Section", "A"],
            ]}
          />
        </SectionCard>
        <SectionCard title="Contact">
          <ProfileFields
            items={[
              ["Email", "rahul@example.com"],
              ["Phone", "+91 98765 43210"],
              ["Address", "Noida, Uttar Pradesh"],
            ]}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentProfile;

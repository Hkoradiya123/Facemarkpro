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

function FaceRegistrationsSummary() {
  const profile = useSessionProfile("faculty");
  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Face Registration Summary"
      subtitle="Face registration overview with faculty dashboard colors."
      profile={profile}
    >
      <StatGrid
        stats={[
          { value: "124", label: "Registered", tone: "green" },
          { value: "6", label: "Pending", tone: "amber" },
          { value: "95%", label: "Coverage", tone: "blue" },
        ]}
      />
      <SectionCard title="Pending Students">
        <SimpleTable
          columns={["Roll No", "Name", "Status"]}
          rows={[
            ["22CS103", "Rohan Das", "Pending"],
            ["22CS117", "Tanvi Shah", "Pending"],
            ["22CS128", "Dev Patel", "Pending"],
          ]}
        />
      </SectionCard>
    </PageShell>
  );
}

export default FaceRegistrationsSummary;

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";

import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../utils/auth";
import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL } from "../utils/constants";
import MiniMetricList from "./MiniMetricList";
import { normalizeFacultyLayout, getWidgetSizeClass } from "../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../components/Shared";

function AttendanceOverviewChart({ sizeClass, summary = { Present: 0, Absent: 0 } }) {
  const present = summary?.Present || 0;
  const absent = summary?.Absent || 0;
  const total = present + absent;
  const presentPct = total ? Math.round((present / total) * 100) : 0;
  const absentPct = total ? 100 - presentPct : 0;

  return (
    <div className={`chart-card compact ${sizeClass} relative flex h-full min-h-0 min-w-0 flex-col`}>
      {sizeClass !== "tiny" ? (
        <div>
          <div className="chart-legend max-w-full self-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[#4fced6]/10 p-[4px_10px] text-[clamp(9px,0.9vw,11px)] text-slate-500 dark:text-ui-text-muted-dark">Today's Attendance Overview</div>
          <div className="chart-subtitle" style={{ fontSize: '0.85rem', color: '#888', marginBottom: '10px' }}>
            All classes combined
          </div>
        </div>
      ) : null}
      <MiniMetricList
        items={[
          ["Present", `${present} (${presentPct}%)`],
          ["Absent", `${absent} (${absentPct}%)`],
          ["Total", String(total)],
        ]}
      />
    </div>
  );
}

export default AttendanceOverviewChart;

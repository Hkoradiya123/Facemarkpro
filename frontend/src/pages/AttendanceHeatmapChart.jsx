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
import { normalizeFacultyLayout, getWidgetSizeClass } from "../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../components/Shared";

function AttendanceHeatmapChart({ sizeClass, heatmap = { classrooms: [], rows: [] } }) {
  const fallbackClassrooms = ["Classroom A-101", "Classroom B-202", "Classroom C-303"];

  const maxClassroomCount = Math.max(
    (heatmap.classrooms || []).length,
    ...(heatmap.rows || []).map((row) => (row.classrooms || []).length),
    3
  );

  const classroomLabels = Array.from({ length: maxClassroomCount }, (_, index) =>
    String((heatmap.classrooms || [])[index] || fallbackClassrooms[index] || `Classroom ${index + 1}`)
  );

  const rows = (heatmap.rows || []).map((row) => {
    const values = Array.from({ length: classroomLabels.length }, (_, index) => Number((row.classrooms || [])[index] || 0));
    const total = values.reduce((sum, current) => sum + current, 0);
    return {
      label: row.label,
      values,
      total,
    };
  });

  if (!rows.length) {
    return <p className="muted-copy">No classroom heatmap data found.</p>;
  }

  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const roundedMax = Math.ceil(maxTotal / 10) * 10;
  const scaleTicks = sizeClass === "tiny" ? 5 : 10;
  const scale = Array.from({ length: scaleTicks + 1 }, (_, index) => Math.round((roundedMax / scaleTicks) * index));

  const palette = ["#ff7d9b", "#66b4eb", "#ffd36d", "#8ad29c", "#b9a3ff", "#ffa07a", "#5fd7d3", "#f6b2ff"];

  const tooltipText = (subject, classroom, value) => `${subject} • ${classroom}: ${value}`;

  return (
    <div className={`heatmap-card ${sizeClass}`}>
      {sizeClass !== "tiny" ? <div className="heatmap-legend">
        {classroomLabels.map((classroom, index) => (
          <span
            key={`${classroom}-${index}`}
            className="legend-chip"
            style={{ "--chip-color": palette[index % palette.length] }}
          >
            {classroom}
          </span>
        ))}
      </div> : null}
      <div className="heatmap-rows">
        {rows.map((row) => (
          <div key={row.label} className="heatmap-row">
            <span className="heatmap-label">{row.label}</span>
            <div className="heatmap-bars" style={{ "--heatmap-grid-cols": scaleTicks }}>
              {row.values.map((value, index) => (
                <span
                  key={`${row.label}-${classroomLabels[index]}-${index}`}
                  className="bar-segment"
                  style={{
                    width: `${(value / roundedMax) * 100}%`,
                    "--segment-color": palette[index % palette.length],
                  }}
                  data-tooltip={tooltipText(row.label, classroomLabels[index], value)}
                  aria-label={`${row.label} ${classroomLabels[index]} ${value}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="heatmap-scale">
        {scale.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}

export default AttendanceHeatmapChart;

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
    return <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No classroom heatmap data found.</p>;
  }

  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const roundedMax = Math.ceil(maxTotal / 10) * 10;
  const scaleTicks = sizeClass === "tiny" ? 5 : 10;
  const scale = Array.from({ length: scaleTicks + 1 }, (_, index) => Math.round((roundedMax / scaleTicks) * index));

  const palette = ["#ff7d9b", "#66b4eb", "#ffd36d", "#8ad29c", "#b9a3ff", "#ffa07a", "#5fd7d3", "#f6b2ff"];

  const tooltipText = (subject, classroom, value) => `${subject} • ${classroom}: ${value}`;

  return (
    <div className={`heatmap-card ${sizeClass} flex min-h-0 min-w-0 flex-col gap-3`}>
      {sizeClass !== "tiny" ? (
        <div className="heatmap-legend flex flex-wrap justify-center gap-2.5">
          {classroomLabels.map((classroom, index) => (
            <span
              key={`${classroom}-${index}`}
              className="legend-chip inline-flex items-center gap-1.5 text-[clamp(9px,0.85vw,11px)] text-slate-500 before:inline-block before:h-2.5 before:w-3.5 before:rounded-[2px] before:bg-[var(--chip-color,#66b4eb)] before:content-['']"
              style={{ "--chip-color": palette[index % palette.length] }}
            >
              {classroom}
            </span>
          ))}
        </div>
      ) : null}
      <div className="heatmap-rows flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="heatmap-row grid grid-cols-[minmax(56px,88px)_1fr] items-center gap-2">
            <span className="heatmap-label text-right text-[clamp(9px,0.95vw,12px)] leading-[1.1] text-[#5b6472]">{row.label}</span>
            <div
              className="heatmap-bars relative z-[1] flex h-[clamp(18px,2.2vw,28px)] min-w-0 border border-[#e5ebf2] [background-size:calc(100%/var(--heatmap-grid-cols,10))_100%] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px)]"
              style={{ "--heatmap-grid-cols": scaleTicks }}
            >
              {row.values.map((value, index) => (
                <span
                  key={`${row.label}-${classroomLabels[index]}-${index}`}
                  className="bar-segment relative h-full cursor-pointer bg-[var(--segment-color,#66b4eb)] hover:z-[3] before:hidden after:pointer-events-none after:absolute after:left-1/2 after:top-1/2 after:z-[8] after:w-max after:max-w-[min(220px,70vw)] after:-translate-x-1/2 after:-translate-y-1/2 after:scale-[0.98] after:whitespace-normal after:text-left after:rounded-lg after:border after:border-slate-400/[0.22] after:bg-slate-900/92 after:p-[6px_8px] after:text-[11px] after:font-semibold after:leading-[1.2] after:text-[#f8fafc] after:opacity-0 after:shadow-[0_10px_22px_rgba(2,6,23,0.28)] after:transition-[opacity,transform] after:duration-[140ms] after:content-[attr(data-tooltip)] hover:after:scale-100 hover:after:opacity-100 dark:after:border-slate-600/80 dark:after:bg-slate-950/95"
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
      <div className="heatmap-scale ml-[98px] grid grid-cols-10 text-[clamp(8px,0.8vw,10px)] text-[#7c8798]">
        {scale.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}

export default AttendanceHeatmapChart;

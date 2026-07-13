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

function MonthlyTrendChart({ sizeClass, labels = [], values = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!values.length) {
    return <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No monthly attendance trend yet.</p>;
  }

  const maxPoints = sizeClass === "tiny" ? 8 : sizeClass === "compact" ? 16 : 30;
  const pointCount = Math.min(labels.length, values.length, maxPoints);
  const shownLabels = labels.slice(-pointCount);
  const shownValues = values.slice(-pointCount).map((value) => Number(value || 0));

  const maxValue = Math.max(...shownValues, 0);
  const yMax = Math.max(100, Math.ceil(maxValue / 20) * 20 || 100);

  const svgWidth = 640;
  const svgHeight = sizeClass === "tiny" ? 170 : 220;
  const margin = {
    top: 12,
    right: 14,
    bottom: sizeClass === "tiny" ? 34 : 48,
    left: 36,
  };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;
  const points = shownValues.map((value, index) => {
    const x = margin.left + (pointCount <= 1 ? 0 : (index * plotWidth) / (pointCount - 1));
    const y = margin.top + (1 - value / yMax) * plotHeight;
    return { x, y, value, label: shownLabels[index] };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x},${margin.top + plotHeight} L${points[0].x},${margin.top + plotHeight} Z`
    : "";

  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const value = (yMax / 5) * index;
    const y = margin.top + plotHeight - (plotHeight * index) / 5;
    return { value: Math.round(value), y };
  });

  const xLabelStep = sizeClass === "tiny" ? 2 : sizeClass === "compact" ? 2 : Math.max(1, Math.ceil(pointCount / 10));

  const firstDate = labels.length > 0 ? new Date(labels[0]) : null;
  const lastDate = labels.length > 0 ? new Date(labels[labels.length - 1]) : null;
  const dateRangeText = firstDate && lastDate ?
    `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "Last 30 days";

  const toDisplayDate = (raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw || "");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handlePointHover = (point) => {
    const xPct = Math.max(8, Math.min(92, (point.x / svgWidth) * 100));
    const yPct = Math.max(10, Math.min(84, (point.y / svgHeight) * 100));
    setHoveredPoint({
      xPct,
      yPct,
      label: toDisplayDate(point.label),
      value: point.value,
    });
  };

  return (
    <div className={`chart-card ${sizeClass} relative flex h-full min-h-0 min-w-0 flex-col`}>
      {sizeClass !== "tiny" ? (
        <div>
          <div className="chart-legend max-w-full self-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[#4fced6]/10 p-[4px_10px] text-[clamp(9px,0.9vw,11px)] text-slate-500 dark:text-ui-text-muted-dark">Monthly Attendance Trend</div>
          <div className="chart-subtitle" style={{ fontSize: "0.85rem", color: "#888", marginBottom: "10px" }}>
            Present students per day • {dateRangeText}
          </div>
        </div>
      ) : null}
      <svg
        className="trend-chart w-full h-full min-h-[120px] flex-1 [overflow:visible]"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Monthly attendance trend"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {yTicks.map((tick) => (
          <g key={`y-${tick.value}`}>
            <line className="chart-grid-line stroke-slate-400/[0.22]" x1={margin.left} y1={tick.y} x2={margin.left + plotWidth} y2={tick.y} />
            <text className="axis-label fill-[#7c8798] text-[9px]" x={margin.left - 8} y={tick.y + 3} textAnchor="end">
              {tick.value}
            </text>
          </g>
        ))}

        {points.map((point, index) =>
          index % xLabelStep === 0 ? (
            <line
              key={`v-${point.label}-${index}`}
              className="chart-grid-line vertical stroke-slate-400/[0.14]"
              x1={point.x}
              y1={margin.top}
              x2={point.x}
              y2={margin.top + plotHeight}
            />
          ) : null
        )}

        <line className="chart-axis-line stroke-slate-400/40" x1={margin.left} y1={margin.top + plotHeight} x2={margin.left + plotWidth} y2={margin.top + plotHeight} />

        {areaPath ? <path className="trend-area fill-[#53c8d1]/20 dark:fill-sky-400/20" d={areaPath} /> : null}
        {linePath ? <path className="trend-line fill-none stroke-[2.2] stroke-[#53c8d1]" d={linePath} /> : null}

        {points.map((point, index) => (
          <circle
            key={`p-${point.label}-${index}`}
            className="trend-point cursor-pointer fill-[#53c8d1] stroke-[1.5] stroke-white transition-[r,filter] duration-[160ms] hover:brightness-105 dark:stroke-slate-900"
            cx={point.x}
            cy={point.y}
            r={4}
            onMouseEnter={() => handlePointHover(point)}
            onMouseMove={() => handlePointHover(point)}
          />
        ))}

        {points.map((point, index) =>
          index % xLabelStep === 0 ? (
            <text
              key={`x-${point.label}-${index}`}
              className="axis-label x fill-[#7c8798] text-[10px]"
              x={point.x}
              y={svgHeight - 10}
              textAnchor="end"
              transform={`rotate(-45 ${point.x} ${svgHeight - 10})`}
            >
              {toDisplayDate(point.label)}
            </text>
          ) : null
        )}
      </svg>
      {hoveredPoint ? (
        <div
          className="chart-hover-tooltip pointer-events-none absolute z-[6] min-w-[150px] -translate-x-1/2 -translate-y-[120%] rounded-lg border border-slate-400/[0.22] bg-slate-900/92 p-[8px_10px] text-[#f8fafc] shadow-[0_10px_24px_rgba(2,6,23,0.32)] after:absolute after:-bottom-1.5 after:left-1/2 after:h-2.5 after:w-2.5 after:-translate-x-1/2 after:rotate-45 after:border-b after:border-r after:border-slate-400/[0.22] after:bg-slate-900/92 after:content-[''] dark:border-slate-600/80 dark:bg-slate-950/95 dark:after:border-slate-600/80 dark:after:bg-slate-950/95"
          style={{ left: `${hoveredPoint.xPct}%`, top: `${hoveredPoint.yPct}%` }}
        >
          <span className="mb-0.5 block text-[11px] text-slate-300">{hoveredPoint.label}</span>
          <strong className="block text-[13px] font-bold text-slate-200">Present Students: {hoveredPoint.value}</strong>
        </div>
      ) : null}
    </div>
  );
}

export default MonthlyTrendChart;

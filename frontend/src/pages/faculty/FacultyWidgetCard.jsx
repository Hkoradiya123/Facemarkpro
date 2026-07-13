import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaArrowDown, FaArrowUp, FaClock, FaDoorOpen, FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";

import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../../utils/auth";
import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL } from "../../utils/constants";
import AttendanceOverviewChart from "../AttendanceOverviewChart";
import MonthlyTrendChart from "../MonthlyTrendChart";
import MiniMetricList from "../MiniMetricList";
import AttendanceHeatmapChart from "../AttendanceHeatmapChart";
import MiniCalendarWidget from "../MiniCalendarWidget";
import { normalizeFacultyLayout, getWidgetSizeClass } from "../../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../../components/Shared";

function FacultyWidgetCard({
  widget,
  onRemove,
  data,
  showMoveControls = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}) {
  const widgetId = widget.i;
  const catalogItem = facultyWidgetCatalog.find((item) => item.id === widgetId);
  const sizeClass = getWidgetSizeClass(widget);
  const isGraphWidget = ["attendance-overview", "monthly-trend", "attendance-heatmap", "subject-attendance"].includes(widgetId);

  return (
    <div
      className={`faculty-widget-card widget-${widgetId} size-${sizeClass}${isGraphWidget ? " graph-widget" : ""} flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-400/[0.18] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-[transform,box-shadow,border-color,background] duration-[240ms] dark:border-ui-border-dark dark:bg-ui-card-dark`}
      data-grid-w={widget.w}
      data-grid-h={widget.h}
    >
      <div className="faculty-widget-header flex items-center justify-between gap-3 border-b border-[#eef2f7] p-[10px_12px_8px] text-slate-700 dark:border-ui-border-dark dark:text-ui-text-dark">
        <div className="widget-drag-handle flex cursor-move items-center gap-2.5 text-slate-700 dark:text-ui-text-dark">
          <span className="widget-dot inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
          <strong>{catalogItem?.title || widgetId}</strong>
        </div>
        <div className="widget-header-actions inline-flex items-center gap-2">
          {showMoveControls ? (
            <div className="widget-mobile-move-controls inline-flex items-center gap-1.5">
              {canMoveUp ? (
                <button
                  type="button"
                  className="widget-move-btn inline-grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-full border border-blue-600/25 bg-blue-600/10 text-blue-700 transition-[transform,background,border-color] duration-[160ms] hover:-translate-y-px hover:border-blue-600/40 hover:bg-blue-600/[0.16] active:translate-y-0"
                  onClick={onMoveUp}
                  aria-label="Move widget up"
                >
                  <FaArrowUp />
                </button>
              ) : null}
              {canMoveDown ? (
                <button
                  type="button"
                  className="widget-move-btn inline-grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-full border border-blue-600/25 bg-blue-600/10 text-blue-700 transition-[transform,background,border-color] duration-[160ms] hover:-translate-y-px hover:border-blue-600/40 hover:bg-blue-600/[0.16] active:translate-y-0"
                  onClick={onMoveDown}
                  aria-label="Move widget down"
                >
                  <FaArrowDown />
                </button>
              ) : null}
            </div>
          ) : null}
          {isGraphWidget ? (
            <span className="widget-hover-hint whitespace-nowrap rounded-full border border-sky-500/24 bg-sky-500/[0.14] px-2 py-1 text-[11px] font-semibold text-sky-700 opacity-0 transition-[opacity,transform] duration-200 dark:border-sky-400/35 dark:bg-sky-400/[0.15] dark:text-sky-300">
              Hover for insights
            </span>
          ) : null}
          <button
            type="button"
            className="widget-remove-btn h-7 w-7 cursor-pointer rounded-full border-0 bg-red-500/[0.12] text-red-600 transition-[transform,background,color,box-shadow] duration-[160ms] hover:scale-[1.08] hover:bg-red-500/20 hover:shadow-[0_8px_18px_rgba(220,38,38,0.18)] active:scale-[0.94]"
            onClick={() => onRemove(widgetId)}
          >
            x
          </button>
        </div>
      </div>
      <div className="faculty-widget-body flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[8px_10px_10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:min-w-0 [&>*]:max-w-full">{renderFacultyWidget(widgetId, sizeClass, data, widget)}</div>
    </div>
  );
}

function toShortDay(day) {
  const map = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };
  return map[day] || day || "";
}

function formatTimeLabel(time) {
  const value = String(time || "").trim();
  if (!value) return "--";
  return value.replace(/^0/, "");
}

function parseLectureTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function getLectureBuckets(lectures) {
  const now = new Date();
  const todayLabel = now.toLocaleDateString("en-US", { weekday: "long" });
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const normalized = (Array.isArray(lectures) ? lectures : [])
    .filter((lecture) => !lecture.day || lecture.day === todayLabel)
    .map((lecture) => ({
      ...lecture,
      startMinutes: parseLectureTime(lecture.start_time),
      endMinutes: parseLectureTime(lecture.end_time),
    }))
    .sort((first, second) => {
      const firstStart = first.startMinutes ?? Number.MAX_SAFE_INTEGER;
      const secondStart = second.startMinutes ?? Number.MAX_SAFE_INTEGER;
      return firstStart - secondStart;
    });

  const current = normalized.find((lecture) => {
    if (lecture.status === "current") return true;
    if (lecture.startMinutes == null || lecture.endMinutes == null) return false;
    return lecture.startMinutes <= nowMinutes && nowMinutes <= lecture.endMinutes;
  }) || null;

  const futureLectures = normalized.filter((lecture) => {
    if (current && lecture === current) return false;
    if (lecture.startMinutes != null) return lecture.startMinutes > nowMinutes;
    return lecture.status === "upcoming" || lecture.status === "next";
  });

  const upcoming = futureLectures[0] || null;
  const later = futureLectures[1] || null;
  const heroLecture = current || upcoming || normalized[0] || null;
  const heroLabel = current ? "Current" : upcoming ? "Upcoming" : heroLecture ? "Today" : "No Lecture";

  return { current, upcoming, later, heroLecture, heroLabel };
}

const LECTURE_SLOT_TONE_BG = {
  muted: "bg-white/[0.14]",
  current: "bg-white/20",
  upcoming: "bg-amber-400/[0.18]",
  later: "bg-slate-900/[0.16]",
};

function LectureSlot({ label, lecture, tone = "muted", compact = false }) {
  if (!lecture) {
    return (
      <div className={`lecture-slot lecture-slot-${tone} is-empty grid gap-0.5 rounded-xl border border-white/14 p-[10px_12px] opacity-[0.78] ${LECTURE_SLOT_TONE_BG[tone] || ""}`}>
        <span className="lecture-slot-label text-[10px] uppercase tracking-[0.08em] opacity-[0.78]">{label}</span>
        <strong className="text-[13px] leading-[1.15]">No lecture</strong>
        <small className="text-[11px] opacity-90">Free slot</small>
      </div>
    );
  }

  return (
    <div className={`lecture-slot lecture-slot-${tone} grid gap-0.5 rounded-xl border border-white/14 p-[10px_12px] ${LECTURE_SLOT_TONE_BG[tone] || ""}`}>
      <span className="lecture-slot-label text-[10px] uppercase tracking-[0.08em] opacity-[0.78]">{label}</span>
      <strong className="text-[13px] leading-[1.15]">{lecture.subject || "Untitled"}</strong>
      <small className="text-[11px] opacity-90">{`${lecture.start_time || "--"}${compact ? "" : ` - ${lecture.end_time || "--"}`}`}</small>
      {!compact ? <small className="text-[11px] opacity-90">{lecture.classroom || `${lecture.branch || ""}-${lecture.semester || ""}${lecture.section || ""}`}</small> : null}
    </div>
  );
}

function StudentRoster({ students, sizeClass }) {
  const list = (students || []).slice(0, sizeClass === "tiny" ? 4 : sizeClass === "compact" ? 6 : 8);
  if (!list.length) {
    return <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No students found for this widget.</p>;
  }

  return (
    <div className={`student-roster ${sizeClass} flex h-full min-h-0 flex-col gap-3`}>
      <div className="student-roster-summary flex items-baseline gap-2.5 rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(125,211,252,0.16))] p-[12px_14px]">
        <strong className="text-[28px] leading-none text-blue-700 dark:text-sky-300">{students.length}</strong>
        <span className="font-semibold text-slate-600 dark:text-ui-text-muted-dark">Students in assigned classes</span>
      </div>
      <div className="student-roster-list flex min-h-0 flex-col gap-2 overflow-auto">
        {list.map((student) => {
          const initials = String(student.name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "?";

          return (
            <article
              key={student.roll_no || student.name}
              className="student-roster-item grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-slate-50 p-[10px_12px] transition-[transform,background,box-shadow] duration-[240ms] hover:-translate-y-px hover:bg-slate-100 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] dark:bg-ui-card-muted-dark dark:hover:bg-slate-800"
            >
              <div className="student-avatar grid h-[38px] w-[38px] place-items-center rounded-full bg-[linear-gradient(135deg,#60a5fa,#2563eb)] text-xs font-extrabold text-white">{initials}</div>
              <div className="student-copy grid min-w-0 gap-0.5">
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-slate-900 dark:text-ui-text-dark">{student.name || "Unknown Student"}</strong>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-500 dark:text-ui-text-muted-dark">{student.roll_no || "No roll number"}</span>
              </div>
              <div className="student-meta">
                <span className="inline-flex overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-blue-500/10 px-2 py-1 text-[11px] dark:bg-blue-500/20 dark:text-sky-300">{student.section || "-"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const LECTURE_DOT_COLOR = { current: "bg-emerald-400", next: "bg-amber-400", upcoming: "bg-blue-400" };

function TinyLectureWidget({ cards }) {
  const heroCard = cards[0] || null;
  if (!heroCard) {
    return (
      <div className="lecture-stack-widget tiny-mode relative min-h-0 h-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="lecture-stack-card active compact-card relative flex flex-col justify-start gap-1.5 p-[10px_10px_8px] text-white opacity-100" data-lecture-type="empty">
          <div className="lecture-stack-mini-tag text-[9px] font-bold uppercase tracking-[0.08em] opacity-90">Today</div>
          <strong className="lecture-stack-mini-title overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-extrabold leading-[1.1]">No Lectures</strong>
          <span className="lecture-stack-mini-time text-[11px] font-semibold opacity-[0.92]">Free day</span>
        </div>
      </div>
    );
  }

  return (
    <div className="lecture-stack-widget tiny-mode relative min-h-0 h-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div
        className={`lecture-stack-card active compact-card type-${heroCard.type} relative flex flex-col justify-start gap-1.5 p-[10px_10px_8px] text-white opacity-100`}
        data-lecture-type={heroCard.type}
      >
        <div className="lecture-stack-mini-top flex items-center gap-1.5">
          <span className={`lecture-stack-dot ${heroCard.type} h-[12px] w-[12px] flex-shrink-0 rounded-full ${LECTURE_DOT_COLOR[heroCard.type] || ""}`} />
          <span className="lecture-stack-mini-tag text-[9px] font-bold uppercase tracking-[0.08em] opacity-90">{heroCard.tag}</span>
        </div>
        <strong className="lecture-stack-mini-title overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-extrabold leading-[1.1]">{heroCard.lecture.subject || "N/A"}</strong>
        <span className="lecture-stack-mini-time text-[11px] font-semibold opacity-[0.92]">{formatTimeLabel(heroCard.lecture.start_time)}</span>
        {cards.length > 1 ? (
          <div className="lecture-stack-mini-footer mt-auto flex flex-col gap-1">
            {cards.slice(1, 3).map((card, index) => (
              <span key={`${card.type}-${index}`} className="lecture-stack-mini-chip block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] leading-[1.1] opacity-[0.88]">
                {card.tag}: {card.lecture.subject || "N/A"}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LectureStackWidget({ lectures, sizeClass, widgetWidth, widgetHeight }) {
  const { current, upcoming, later, heroLecture, heroLabel } = getLectureBuckets(lectures || []);
  const cards = [];

  if (current) {
    cards.push({ lecture: current, type: "current", tag: "Now", progress: true });
  }
  if (upcoming) {
    cards.push({ lecture: upcoming, type: "next", tag: "Next" });
  }
  if (later) {
    cards.push({ lecture: later, type: "upcoming", tag: "Later" });
  }

  if (!cards.length && heroLecture) {
    cards.push({ lecture: heroLecture, type: upcoming ? "next" : "upcoming", tag: heroLabel });
  }

  if (sizeClass === "tiny" || Number(widgetWidth || 0) <= 2 || Number(widgetHeight || 0) <= 2) {
    return <TinyLectureWidget cards={cards} />;
  }

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [cards.length]);

  useEffect(() => {
    if (cards.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % cards.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [cards.length]);

  if (!cards.length) {
    return (
      <div className="lecture-stack-widget relative h-full min-h-[120px] overflow-hidden rounded-xl bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="lecture-stack-card active absolute inset-0 z-[2] flex flex-col justify-center p-5 text-white opacity-100" data-lecture-type="empty">
          <div className="lecture-stack-header mb-[15px] flex items-center justify-between gap-3">
            <div className="lecture-stack-status flex min-w-0 items-center gap-2">
              <span className="lecture-stack-dot upcoming h-[12px] w-[12px] flex-shrink-0 rounded-full bg-blue-400" />
              <h3 className="lecture-stack-title m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1.4rem] font-bold [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">No Lectures Today</h3>
            </div>
          </div>
          <div className="lecture-stack-details mt-3">
            <div className="lecture-stack-info mb-2 flex items-center gap-2 text-[0.95rem] opacity-90">
              <span>No lecture data available right now.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lecture-stack-widget relative h-full min-h-[120px] overflow-hidden rounded-xl bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      {cards.length > 1 ? (
        <div className="lecture-stack-indicator absolute bottom-4 right-4 z-[4] flex gap-2">
          {cards.map((card, index) => (
            <button
              key={`${card.type}-${index}`}
              type="button"
              className={`lecture-stack-indicator-dot${activeIndex === index ? " active" : ""} h-2.5 w-2.5 cursor-pointer rounded-full border-0 p-0 ${
                activeIndex === index ? "bg-white" : "bg-white/35"
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${card.tag} lecture`}
            />
          ))}
        </div>
      ) : null}
      {cards.map((card, index) => {
        const lecture = card.lecture;
        const active = activeIndex === index;
        return (
          <div
            key={`${card.type}-${lecture.subject || "lecture"}-${index}`}
            className={`lecture-stack-card${active ? " active" : ""} absolute inset-0 flex flex-col justify-center p-5 text-white transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${
              active ? "z-[2] translate-x-0 opacity-100" : "z-[1] translate-x-full opacity-0"
            }`}
            data-lecture-type={card.type}
          >
            <div className="lecture-stack-header mb-[15px] flex items-center justify-between gap-3">
              <div className="lecture-stack-status flex min-w-0 items-center gap-2">
                <span className={`lecture-stack-dot ${card.type} h-[12px] w-[12px] flex-shrink-0 rounded-full ${LECTURE_DOT_COLOR[card.type] || ""}`} />
                <h3 className="lecture-stack-title m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1.4rem] font-bold [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">{lecture.subject || "N/A"}</h3>
              </div>
              <span className="lecture-stack-tag flex-shrink-0 rounded-[20px] bg-white/20 px-3 py-1 text-[0.8rem] font-semibold backdrop-blur-[10px]">{card.tag}</span>
            </div>
            {card.progress ? (
              <div className="lecture-stack-progress mb-2">
                <div className="lecture-stack-progress-bar h-2 w-full overflow-hidden rounded-full bg-white/[0.22]">
                  <div className="lecture-stack-progress-fill h-full rounded-[inherit] bg-[linear-gradient(90deg,#4ade80_0%,#43e794_100%)]" style={{ width: "65%" }} />
                </div>
              </div>
            ) : null}
            <div className="lecture-stack-details mt-3">
              <div className="lecture-stack-info mb-2 flex items-center gap-2 text-[0.95rem] opacity-90">
                <FaDoorOpen />
                <span>{lecture.classroom || "N/A"}</span>
              </div>
              <div className="lecture-stack-time mt-2 flex items-center gap-2 text-[1.1rem] font-semibold">
                <FaClock />
                <span>{`${lecture.start_time || ""} - ${lecture.end_time || ""}`}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderFacultyWidget(widgetId, sizeClass, data, widget) {
  switch (widgetId) {
    case "timetable":
      {
        const lectures = data?.lectures || [];
        if (!lectures.length) {
          return <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No timetable data found.</p>;
        }

        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const slots = [...new Set(lectures.map((lecture) => lecture.start_time).filter(Boolean))].sort((first, second) => {
          const firstMinutes = parseLectureTime(first);
          const secondMinutes = parseLectureTime(second);
          if (firstMinutes == null && secondMinutes == null) return String(first).localeCompare(String(second));
          if (firstMinutes == null) return 1;
          if (secondMinutes == null) return -1;
          return firstMinutes - secondMinutes;
        });
        const visibleSlots = sizeClass === "tiny" ? slots.slice(0, 3) : sizeClass === "compact" ? slots.slice(0, 4) : slots.slice(0, 6);

        const gridMap = {};
        for (const lecture of lectures) {
          const key = `${toShortDay(lecture.day)}|${lecture.start_time}`;
          if (!gridMap[key]) {
            gridMap[key] = lecture;
          }
        }

        const ttCellBase =
          "flex min-h-0 min-w-0 flex-col items-center justify-center gap-px overflow-hidden border-b border-r border-[#e5eaf1] p-0.5 text-center [&:nth-child(7n)]:border-r-0";

        return (
          <div className={`timetable-grid-card ${sizeClass} flex h-full min-h-0 overflow-hidden`}>
            <div className="timetable-grid grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(44px,0.9fr)_repeat(6,minmax(0,1fr))] grid-rows-[minmax(22px,0.65fr)_repeat(5,minmax(0,1fr))] overflow-hidden rounded-xl border border-[#e5eaf1] bg-white [&>:nth-last-child(-n+7)]:border-b-0">
              <div className={`tt-corner ${ttCellBase} bg-[#f8fafc]`} />
              {days.map((day) => (
                <div key={day} className={`tt-head ${ttCellBase} whitespace-nowrap bg-[#f8fafc] text-[clamp(8px,0.9vw,12px)] font-bold text-[#3f4752]`}>
                  {day}
                </div>
              ))}

              {visibleSlots.map((time) => (
                <Fragment key={time}>
                  <div className={`tt-time ${ttCellBase} whitespace-nowrap bg-[#fbfcfe] text-[clamp(7px,0.85vw,11px)] font-bold text-[#5d6777]`}>{formatTimeLabel(time)}</div>
                  {days.map((day) => {
                    const lecture = gridMap[`${day}|${time}`];
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`tt-cell${lecture ? " tt-cell-filled" : ""} ${ttCellBase} bg-white transition-[background-color,box-shadow,transform,border-radius] duration-200 ${
                          lecture
                            ? "cursor-pointer hover:z-[1] hover:-translate-y-px hover:rounded-[10px] hover:bg-[linear-gradient(180deg,#dbeeff_0%,#cde5fa_100%)] hover:shadow-[inset_0_0_0_1px_rgba(93,157,214,0.35),0_6px_14px_rgba(73,124,170,0.22)] [&:hover>strong]:text-[#1f3b55] [&:hover>small]:text-[#355a7c] dark:hover:bg-[linear-gradient(180deg,rgba(59,130,246,0.34)_0%,rgba(37,99,235,0.3)_100%)] dark:hover:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.34),0_6px_14px_rgba(14,116,144,0.28)] dark:[&:hover>strong]:text-[#e2f2ff] dark:[&:hover>small]:text-[#cce6ff]"
                            : ""
                        }`}
                      >
                        {lecture ? (
                          <>
                            <strong className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,1vw,13px)] font-bold leading-[1.05] text-[#222]">{lecture.subject}</strong>
                            <small className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(6px,0.7vw,9px)] leading-none text-[#657184]">{lecture.classroom || `${lecture.branch}-${lecture.semester}${lecture.section}`}</small>
                          </>
                        ) : (
                          <small className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(6px,0.7vw,9px)] leading-none text-[#657184]">-</small>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        );
      }
    case "current-lecture":
      return (
        <LectureStackWidget
          lectures={data?.lectures || []}
          sizeClass={sizeClass}
          widgetWidth={widget?.w}
          widgetHeight={widget?.h}
        />
      );
    case "attendance-overview":
      return <AttendanceOverviewChart sizeClass={sizeClass} summary={data?.attendance_stats} />;
    case "monthly-trend":
      return <MonthlyTrendChart sizeClass={sizeClass} labels={data?.monthly_labels} values={data?.monthly_data} />;
    case "subject-attendance":
      return <MiniMetricList items={(data?.subject_attendance || []).slice(0, 6).map((item) => [item.subject, `${item.percentage}%`])} />;
    case "attendance-heatmap":
      return <AttendanceHeatmapChart sizeClass={sizeClass} heatmap={data?.heatmap} />;
    case "student-list":
      return <StudentRoster students={data?.students_list || []} sizeClass={sizeClass} />;
    case "notifications":
      return (
        <ul className="plain-list compact m-0 flex flex-col gap-3 pl-[18px]">
          <li>{`${(data?.lectures || []).length} lecture slots loaded for your timetable.`}</li>
          <li>{`${data?.attendance_stats?.Present || 0} students marked present today.`}</li>
          <li>{`${(data?.students_list || []).length} students in your assigned classes.`}</li>
        </ul>
      );
    case "quick-stats":
      {
        const present = Number(data?.attendance_stats?.Present || 0);
        const absent = Number(data?.attendance_stats?.Absent || 0);
        const attendanceTotal = present + absent;

        return (
          <MiniMetricList
            items={[
              { label: "Students", value: String((data?.students_list || []).length) },
              {
                label: "Present",
                value: String(present),
                fill: attendanceTotal ? (present / attendanceTotal) * 100 : 0,
                tone: "present",
              },
              {
                label: "Absent",
                value: String(absent),
                fill: attendanceTotal ? (absent / attendanceTotal) * 100 : 0,
                tone: "absent",
              },
            ]}
          />
        );
      }
    case "calendar":
      return <MiniCalendarWidget sizeClass={sizeClass} />;
    default:
      return <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">Widget preview</p>;
  }
}

export default FacultyWidgetCard;

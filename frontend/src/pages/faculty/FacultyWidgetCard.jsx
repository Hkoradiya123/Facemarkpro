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
      className={`faculty-widget-card widget-${widgetId} size-${sizeClass}${isGraphWidget ? " graph-widget" : ""}`}
      data-grid-w={widget.w}
      data-grid-h={widget.h}
    >
      <div className="faculty-widget-header">
        <div className="widget-drag-handle">
          <span className="widget-dot" />
          <strong>{catalogItem?.title || widgetId}</strong>
        </div>
        <div className="widget-header-actions">
          {showMoveControls ? (
            <div className="widget-mobile-move-controls">
              {canMoveUp ? (
                <button
                  type="button"
                  className="widget-move-btn"
                  onClick={onMoveUp}
                  aria-label="Move widget up"
                >
                  <FaArrowUp />
                </button>
              ) : null}
              {canMoveDown ? (
                <button
                  type="button"
                  className="widget-move-btn"
                  onClick={onMoveDown}
                  aria-label="Move widget down"
                >
                  <FaArrowDown />
                </button>
              ) : null}
            </div>
          ) : null}
          {isGraphWidget ? <span className="widget-hover-hint">Hover for insights</span> : null}
          <button type="button" className="widget-remove-btn" onClick={() => onRemove(widgetId)}>
            x
          </button>
        </div>
      </div>
      <div className="faculty-widget-body">{renderFacultyWidget(widgetId, sizeClass, data, widget)}</div>
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

function LectureSlot({ label, lecture, tone = "muted", compact = false }) {
  if (!lecture) {
    return (
      <div className={`lecture-slot lecture-slot-${tone} is-empty`}>
        <span className="lecture-slot-label">{label}</span>
        <strong>No lecture</strong>
        <small>Free slot</small>
      </div>
    );
  }

  return (
    <div className={`lecture-slot lecture-slot-${tone}`}>
      <span className="lecture-slot-label">{label}</span>
      <strong>{lecture.subject || "Untitled"}</strong>
      <small>{`${lecture.start_time || "--"}${compact ? "" : ` - ${lecture.end_time || "--"}`}`}</small>
      {!compact ? <small>{lecture.classroom || `${lecture.branch || ""}-${lecture.semester || ""}${lecture.section || ""}`}</small> : null}
    </div>
  );
}

function StudentRoster({ students, sizeClass }) {
  const list = (students || []).slice(0, sizeClass === "tiny" ? 4 : sizeClass === "compact" ? 6 : 8);
  if (!list.length) {
    return <p className="muted-copy">No students found for this widget.</p>;
  }

  return (
    <div className={`student-roster ${sizeClass}`}>
      <div className="student-roster-summary">
        <strong>{students.length}</strong>
        <span>Students in assigned classes</span>
      </div>
      <div className="student-roster-list">
        {list.map((student) => {
          const initials = String(student.name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "?";

          return (
            <article key={student.roll_no || student.name} className="student-roster-item">
              <div className="student-avatar">{initials}</div>
              <div className="student-copy">
                <strong>{student.name || "Unknown Student"}</strong>
                <span>{student.roll_no || "No roll number"}</span>
              </div>
              <div className="student-meta">
                <span>{student.section || "-"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TinyLectureWidget({ cards }) {
  const heroCard = cards[0] || null;
  if (!heroCard) {
    return (
      <div className="lecture-stack-widget tiny-mode">
        <div className="lecture-stack-card active compact-card" data-lecture-type="empty">
          <div className="lecture-stack-mini-tag">Today</div>
          <strong className="lecture-stack-mini-title">No Lectures</strong>
          <span className="lecture-stack-mini-time">Free day</span>
        </div>
      </div>
    );
  }

  return (
    <div className="lecture-stack-widget tiny-mode">
      <div className={`lecture-stack-card active compact-card type-${heroCard.type}`} data-lecture-type={heroCard.type}>
        <div className="lecture-stack-mini-top">
          <span className={`lecture-stack-dot ${heroCard.type}`} />
          <span className="lecture-stack-mini-tag">{heroCard.tag}</span>
        </div>
        <strong className="lecture-stack-mini-title">{heroCard.lecture.subject || "N/A"}</strong>
        <span className="lecture-stack-mini-time">{formatTimeLabel(heroCard.lecture.start_time)}</span>
        {cards.length > 1 ? (
          <div className="lecture-stack-mini-footer">
            {cards.slice(1, 3).map((card, index) => (
              <span key={`${card.type}-${index}`} className="lecture-stack-mini-chip">
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
      <div className="lecture-stack-widget">
        <div className="lecture-stack-card active" data-lecture-type="empty">
          <div className="lecture-stack-header">
            <div className="lecture-stack-status">
              <span className="lecture-stack-dot upcoming" />
              <h3 className="lecture-stack-title">No Lectures Today</h3>
            </div>
          </div>
          <div className="lecture-stack-details">
            <div className="lecture-stack-info">
              <span>No lecture data available right now.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lecture-stack-widget">
      {cards.length > 1 ? (
        <div className="lecture-stack-indicator">
          {cards.map((card, index) => (
            <button
              key={`${card.type}-${index}`}
              type="button"
              className={`lecture-stack-indicator-dot${activeIndex === index ? " active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${card.tag} lecture`}
            />
          ))}
        </div>
      ) : null}
      {cards.map((card, index) => {
        const lecture = card.lecture;
        return (
          <div
            key={`${card.type}-${lecture.subject || "lecture"}-${index}`}
            className={`lecture-stack-card${activeIndex === index ? " active" : ""}`}
            data-lecture-type={card.type}
          >
            <div className="lecture-stack-header">
              <div className="lecture-stack-status">
                <span className={`lecture-stack-dot ${card.type}`} />
                <h3 className="lecture-stack-title">{lecture.subject || "N/A"}</h3>
              </div>
              <span className="lecture-stack-tag">{card.tag}</span>
            </div>
            {card.progress ? (
              <div className="lecture-stack-progress">
                <div className="lecture-stack-progress-bar">
                  <div className="lecture-stack-progress-fill" style={{ width: "65%" }} />
                </div>
              </div>
            ) : null}
            <div className="lecture-stack-details">
              <div className="lecture-stack-info">
                <FaDoorOpen />
                <span>{lecture.classroom || "N/A"}</span>
              </div>
              <div className="lecture-stack-time">
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
          return <p className="muted-copy">No timetable data found.</p>;
        }

        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const slots = [...new Set(lectures.map((lecture) => lecture.start_time).filter(Boolean))].sort();
        const visibleSlots = sizeClass === "tiny" ? slots.slice(0, 3) : sizeClass === "compact" ? slots.slice(0, 4) : slots.slice(0, 6);

        const gridMap = {};
        for (const lecture of lectures) {
          const key = `${toShortDay(lecture.day)}|${lecture.start_time}`;
          if (!gridMap[key]) {
            gridMap[key] = lecture;
          }
        }

        return (
          <div className={`timetable-grid-card ${sizeClass}`}>
            <div className="timetable-grid">
              <div className="tt-corner" />
              {days.map((day) => (
                <div key={day} className="tt-head">
                  {day}
                </div>
              ))}

              {visibleSlots.map((time) => (
                <Fragment key={time}>
                  <div className="tt-time">{formatTimeLabel(time)}</div>
                  {days.map((day) => {
                    const lecture = gridMap[`${day}|${time}`];
                    return (
                      <div key={`${day}-${time}`} className={`tt-cell${lecture ? " tt-cell-filled" : ""}`}>
                        {lecture ? (
                          <>
                            <strong>{lecture.subject}</strong>
                            <small>{lecture.classroom || `${lecture.branch}-${lecture.semester}${lecture.section}`}</small>
                          </>
                        ) : (
                          <small>-</small>
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
        <ul className="plain-list compact">
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
      return <p className="muted-copy">Widget preview</p>;
  }
}

export default FacultyWidgetCard;

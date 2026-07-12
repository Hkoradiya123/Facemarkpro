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

function StudentTimetable() {
  const profile = useSessionProfile("student");
  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="Student Timetable"
      subtitle="Weekly class schedule with the same bright dashboard palette."
      profile={profile}
    >
      <SectionCard title="Weekly Timetable">
        <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
          <table className="matrix-table timetable w-full min-w-0 table-fixed border-collapse">
            <thead>
              <tr>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">Day</th>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">09:00</th>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">10:00</th>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">11:00</th>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">12:00</th>
                <th className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]">02:00</th>
              </tr>
            </thead>
            <tbody>
              {weeklyTimetable.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={`${index === 0 ? "day-cell bg-[#f4f6fa] font-bold" : "slot-cell rounded-[10px]"} border-b border-[#edf2f7] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] align-middle text-[clamp(10px,1vw,14px)] [overflow-wrap:anywhere] [word-break:break-word]`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageShell>
  );
}

export default StudentTimetable;

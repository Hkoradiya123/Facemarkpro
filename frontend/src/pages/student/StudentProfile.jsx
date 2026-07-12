import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaMapPin, FaAward, FaBook, FaCamera,
  FaGraduationCap, FaCalendarDays, FaPencil, FaCircleCheck, FaChartLine
} from "react-icons/fa6";

import { getStoredAuthUser, useSessionProfile } from "../../utils/auth";
import { studentNav } from "../../utils/constants";
import { PageShell, SectionCard, ProfileFields } from "../../components/Shared";

function StudentProfile() {
  const profile = useSessionProfile("student");
  const storedUser = getStoredAuthUser() || {};
  const [isEditing, setIsEditing] = useState(false);

  const displayName = storedUser?.name || storedUser?.roll_no || "Student";
  const displayMeta = storedUser?.roll_no || "Roll No Not Available";

  return (
    <PageShell
      variant="student"
      nav={studentNav}
      title="My Profile"
      subtitle="View and manage your student information."
      profile={profile}
      actions={
        <Link
          to="/student/dashboard"
          className="btn-secondary inline-flex items-center gap-2 rounded-[10px] border-0 bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] px-5 py-2.5 text-sm font-semibold text-ui-text no-underline transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#cbd5e1_0%,#94a3b8_100%)] dark:text-ui-text-dark"
        >
          ← Back to Dashboard
        </Link>
      }
    >
      <div className="student-profile-grid grid grid-cols-1 gap-6 py-6">
        {/* Profile Header Card */}
        <SectionCard className="student-profile-header !border-0 bg-[linear-gradient(135deg,#4a90e2_0%,#357abd_100%)] text-white shadow-[0_12px_40px_rgba(25,118,210,0.2)]">
          <div className="profile-header-content flex items-start gap-6 max-[640px]:flex-col max-[640px]:items-center max-[640px]:text-center">
            <div className="profile-avatar-large flex h-[120px] w-[120px] min-w-[120px] items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white/40 bg-white/20 text-[48px] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
              {storedUser?.photoPath ? (
                <img src={storedUser.photoPath} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="profile-header-info flex flex-1 flex-col gap-2">
              <h2 className="m-[0_0_4px_0] text-[28px] font-extrabold leading-[1.2]">{displayName}</h2>
              <p className="profile-role m-0 flex items-center gap-1.5 text-sm opacity-95">
                <FaGraduationCap /> Student
              </p>
              <p className="profile-roll m-0 font-mono text-[13px] font-semibold opacity-85">{storedUser?.roll_no || "Roll No Not Set"}</p>
              <div className="profile-badges mt-1 flex flex-wrap gap-2">
                {storedUser?.faceRegistered && (
                  <span className="badge badge-success inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold capitalize text-white">
                    <FaCircleCheck /> Face Registered
                  </span>
                )}
                <span className="badge badge-info inline-flex items-center gap-1 rounded-lg border border-blue-400/40 bg-blue-400/20 px-3 py-1.5 text-xs font-semibold capitalize text-white">
                  <FaBook /> Active
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Academic Information */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:text-blue-500">
              <FaGraduationCap />
              <span>Academic Information</span>
            </span>
          }
          className="student-profile-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="profile-info-grid three grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
            <div className="info-item flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaGraduationCap /> Branch
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.branch || "Not Specified"}</div>
            </div>
            <div className="info-item flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaCalendarDays /> Semester
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.semester || "Not Specified"}</div>
            </div>
            <div className="info-item flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaAward /> Section
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.section || "Not Specified"}</div>
            </div>
          </div>
        </SectionCard>

        {/* Contact Information */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:text-blue-500">
              <FaEnvelope />
              <span>Contact Information</span>
            </span>
          }
          className="student-profile-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="profile-info-grid two grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
            <div className="info-item full-width col-span-full flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaEnvelope /> Email Address
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.email || "Not Provided"}</div>
            </div>
            <div className="info-item flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaPhone /> Phone Number
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.phone || "Not Provided"}</div>
            </div>
            <div className="info-item flex flex-col gap-2 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08]">
              <div className="info-label flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-700">
                <FaMapPin /> Address
              </div>
              <div className="info-value text-[15px] font-semibold leading-[1.4] text-ui-text dark:text-ui-text-dark">{storedUser?.address || "Not Provided"}</div>
            </div>
          </div>
        </SectionCard>

        {/* Face Recognition Status */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:text-blue-500">
              <FaCamera />
              <span>Face Recognition</span>
            </span>
          }
          className="student-profile-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="face-recognition-section flex flex-col items-start gap-4">
            <div className="face-status flex w-full items-start gap-4 rounded-xl border border-blue-700/10 bg-[linear-gradient(135deg,rgba(25,118,210,0.05)_0%,rgba(25,118,210,0.02)_100%)] p-5 dark:border-blue-600/20 dark:bg-blue-600/[0.08]">
              {storedUser?.faceRegistered ? (
                <>
                  <div className="status-icon success flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#34d399_0%,#10b981_100%)] text-2xl text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    <FaCircleCheck />
                  </div>
                  <div className="status-text flex flex-1 flex-col gap-1">
                    <h4 className="m-0 text-[15px] font-bold text-ui-text dark:text-ui-text-dark">Face Registered</h4>
                    <p className="m-0 text-[13px] leading-[1.4] text-ui-text-muted dark:text-ui-text-muted-dark">Your face is registered in the system for attendance marking.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="status-icon warning flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_100%)] text-2xl text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    <FaCamera />
                  </div>
                  <div className="status-text flex flex-1 flex-col gap-1">
                    <h4 className="m-0 text-[15px] font-bold text-ui-text dark:text-ui-text-dark">Face Not Registered</h4>
                    <p className="m-0 text-[13px] leading-[1.4] text-ui-text-muted dark:text-ui-text-muted-dark">Please register your face to enable automated attendance marking.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Account Actions */}
        <SectionCard
          title={
            <span className="section-title-with-icon flex items-center gap-2 [&>svg]:text-blue-500">
              <FaPencil />
              <span>Account Settings</span>
            </span>
          }
          className="student-profile-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <div className="account-actions flex flex-col gap-3">
            <Link
              to="/student/change-password"
              className="action-link flex items-center gap-4 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 text-ui-text no-underline transition-all duration-300 hover:translate-x-1 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08] [&:hover_.action-arrow]:translate-x-1 [&:hover_.action-arrow]:opacity-100"
            >
              <div className="action-icon flex-shrink-0 text-2xl">
                <FaPencil />
              </div>
              <div className="action-text flex flex-1 flex-col gap-0.5">
                <h4 className="m-0 text-sm font-bold">Change Password</h4>
                <p className="m-0 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">Update your password to keep your account secure</p>
              </div>
              <span className="action-arrow flex-shrink-0 text-lg text-blue-700 opacity-60 transition-all duration-300">→</span>
            </Link>
            <Link
              to="/student/attendance"
              className="action-link flex items-center gap-4 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f5f7fb_0%,#f0f4fb_100%)] p-4 text-ui-text no-underline transition-all duration-300 hover:translate-x-1 hover:border-blue-700 hover:bg-[linear-gradient(135deg,#eff6ff_0%,#e6f0ff_100%)] hover:shadow-[0_8px_16px_rgba(25,118,210,0.08)] dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark dark:hover:border-blue-500/30 dark:hover:bg-blue-600/[0.08] [&:hover_.action-arrow]:translate-x-1 [&:hover_.action-arrow]:opacity-100"
            >
              <div className="action-icon flex-shrink-0 text-2xl">
                <FaChartLine />
              </div>
              <div className="action-text flex flex-1 flex-col gap-0.5">
                <h4 className="m-0 text-sm font-bold">View Attendance</h4>
                <p className="m-0 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">Check your attendance records and statistics</p>
              </div>
              <span className="action-arrow flex-shrink-0 text-lg text-blue-700 opacity-60 transition-all duration-300">→</span>
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentProfile;

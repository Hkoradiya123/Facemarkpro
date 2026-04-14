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
        <Link to="/student/dashboard" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      }
    >
      <div className="student-profile-grid">
        {/* Profile Header Card */}
        <SectionCard className="student-profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar-large">
              {storedUser?.photoPath ? (
                <img src={storedUser.photoPath} alt={displayName} />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="profile-header-info">
              <h2>{displayName}</h2>
              <p className="profile-role">
                <FaGraduationCap /> Student
              </p>
              <p className="profile-roll">{storedUser?.roll_no || "Roll No Not Set"}</p>
              <div className="profile-badges">
                {storedUser?.faceRegistered && (
                  <span className="badge badge-success">
                    <FaCircleCheck /> Face Registered
                  </span>
                )}
                <span className="badge badge-info">
                  <FaBook /> Active
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Academic Information */}
        <SectionCard
          title={
            <span className="section-title-with-icon">
              <FaGraduationCap />
              <span>Academic Information</span>
            </span>
          }
          className="student-profile-card"
        >
          <div className="profile-info-grid three">
            <div className="info-item">
              <div className="info-label">
                <FaGraduationCap /> Branch
              </div>
              <div className="info-value">{storedUser?.branch || "Not Specified"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaCalendarDays /> Semester
              </div>
              <div className="info-value">{storedUser?.semester || "Not Specified"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaAward /> Section
              </div>
              <div className="info-value">{storedUser?.section || "Not Specified"}</div>
            </div>
          </div>
        </SectionCard>

        {/* Contact Information */}
        <SectionCard
          title={
            <span className="section-title-with-icon">
              <FaEnvelope />
              <span>Contact Information</span>
            </span>
          }
          className="student-profile-card"
        >
          <div className="profile-info-grid two">
            <div className="info-item full-width">
              <div className="info-label">
                <FaEnvelope /> Email Address
              </div>
              <div className="info-value">{storedUser?.email || "Not Provided"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaPhone /> Phone Number
              </div>
              <div className="info-value">{storedUser?.phone || "Not Provided"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaMapPin /> Address
              </div>
              <div className="info-value">{storedUser?.address || "Not Provided"}</div>
            </div>
          </div>
        </SectionCard>

        {/* Face Recognition Status */}
        <SectionCard
          title={
            <span className="section-title-with-icon">
              <FaCamera />
              <span>Face Recognition</span>
            </span>
          }
          className="student-profile-card"
        >
          <div className="face-recognition-section">
            <div className="face-status">
              {storedUser?.faceRegistered ? (
                <>
                  <div className="status-icon success">
                    <FaCircleCheck />
                  </div>
                  <div className="status-text">
                    <h4>Face Registered</h4>
                    <p>Your face is registered in the system for attendance marking.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="status-icon warning">
                    <FaCamera />
                  </div>
                  <div className="status-text">
                    <h4>Face Not Registered</h4>
                    <p>Please register your face to enable automated attendance marking.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Account Actions */}
        <SectionCard
          title={
            <span className="section-title-with-icon">
              <FaPencil />
              <span>Account Settings</span>
            </span>
          }
          className="student-profile-card"
        >
          <div className="account-actions">
            <Link to="/student/change-password" className="action-link">
              <div className="action-icon">
                <FaPencil />
              </div>
              <div className="action-text">
                <h4>Change Password</h4>
                <p>Update your password to keep your account secure</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
            <Link to="/student/attendance" className="action-link">
              <div className="action-icon">
                <FaChartLine />
              </div>
              <div className="action-text">
                <h4>View Attendance</h4>
                <p>Check your attendance records and statistics</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default StudentProfile;

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus, FaEye, FaPencil, FaTrash, FaCamera
} from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, TableSkeleton } from "../../components/Shared";

function AdminManageStudents() {
  const navigate = useNavigate();
  const profile = useSessionProfile("admin");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmState, setConfirmState] = useState({
    open: false,
    studentId: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    roll_no: "",
    branch: "CSE",
    semester: "1",
    section: "A",
  });
  const [openFaceRegistrationAfterAdd, setOpenFaceRegistrationAfterAdd] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/students"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.students)) {
        setStudents(data.students);
      } else {
        setError(data.message || "Failed to load students");
      }
    } catch (err) {
      console.error("Students load error:", err);
      setError("Network error while loading students");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roll_no || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.branch || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const executeDelete = async (studentId) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/students/${studentId}`), {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s._id !== studentId));
        setActionMessage("Student removed successfully.");
      } else {
        setError(data.message || "Failed to delete student.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Network error while deleting student.");
    }
  };

  const openDeleteConfirm = (studentId) => {
    setConfirmState({ open: true, studentId });
  };

  const closeDeleteConfirm = () => {
    setConfirmState({ open: false, studentId: "" });
  };

  const onConfirmDelete = async () => {
    const id = confirmState.studentId;
    closeDeleteConfirm();
    if (id) await executeDelete(id);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError("");
    setActionMessage("");

    if (!addForm.name.trim() || !addForm.roll_no.trim()) {
      setError("Name and roll number are required.");
      return;
    }

    try {
      setAddLoading(true);
      const res = await fetch(apiUrl("/api/admin/students"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: addForm.name.trim(),
          roll_no: addForm.roll_no.trim(),
          branch: addForm.branch,
          semester: Number(addForm.semester),
          section: addForm.section,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const nextRollNo = addForm.roll_no.trim();
        const shouldOpenFaceRegistration = openFaceRegistrationAfterAdd;
        if (data.student) {
          setStudents((prev) => [data.student, ...prev]);
        } else {
          await loadStudents();
        }
        setShowAddModal(false);
        setAddForm({ name: "", roll_no: "", branch: "CSE", semester: "1", section: "A" });
        setOpenFaceRegistrationAfterAdd(false);

        if (shouldOpenFaceRegistration && nextRollNo) {
          navigate(`/admin/manage-faces?open=1&mode=create&roll=${encodeURIComponent(nextRollNo)}`);
          return;
        }

        setActionMessage("Student added successfully.");
      } else {
        setError(data.message || "Failed to add student.");
      }
    } catch (err) {
      console.error("Add student error:", err);
      setError("Network error while adding student.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <PageShell
      variant="admin"
      nav={adminNav}
      title="Manage Students"
      subtitle="Student master list with semester, section, and branch data."
      profile={profile}
    >
      <SectionCard title="Student List">
        <div className="admin-table-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, roll number, or branch..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button className="primary-btn" onClick={() => setShowAddModal(true)}>
            <FaPlus /> Add Student
          </button>
        </div>

        {actionMessage ? <p className="success-copy">{actionMessage}</p> : null}

        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <p className="error-copy">{error}</p>
        ) : paginatedStudents.length === 0 ? (
          <p className="muted-copy">No students found.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>Semester / Section</th>
                    <th>Face</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((s, idx) => (
                    <tr key={s._id || idx}>
                      <td className="student-roll">
                        <strong>{s.roll_no || "—"}</strong>
                      </td>
                      <td className="student-name">{s.name || "—"}</td>
                      <td>
                        <span className="dept-badge">{s.branch || "—"}</span>
                      </td>
                      <td>
                        <span className="semester-badge">
                          {s.semester}-{s.section || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`face-badge ${s.face_registered ? "registered" : "missing"}`}>
                          {s.face_registered ? "Registered" : "Not Registered"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button className="action-btn view-btn" title="View">
                          <FaEye />
                        </button>
                        <button className="action-btn edit-btn" title="Edit">
                          <FaPencil />
                        </button>
                        <button
                          className={`face-text-btn ${s.face_registered ? "reregister" : "add"}`}
                          title={s.face_registered ? "Re-register Face" : "Add Face"}
                          onClick={() => {
                            const mode = s.face_registered ? "replace" : "create";
                            navigate(
                              `/admin/manage-faces?open=1&mode=${mode}&roll=${encodeURIComponent(s.roll_no || "")}`
                            );
                          }}
                        >
                          <FaCamera /> {s.face_registered ? "Re-register Face" : "Add Face"}
                        </button>
                        <button
                          className="action-btn delete-btn"
                          title="Delete"
                          onClick={() => openDeleteConfirm(s._id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {confirmState.open ? (
        <div className="admin-modal-overlay" onClick={closeDeleteConfirm}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Confirm Delete</h3>
              <button className="admin-modal-close" onClick={closeDeleteConfirm}>x</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-confirm-message">Are you sure you want to delete this student?</p>
              <div className="admin-confirm-actions">
                <button className="pagination-btn" onClick={closeDeleteConfirm}>Cancel</button>
                <button className="primary-btn" onClick={onConfirmDelete}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddModal ? (
        <div className="admin-modal-overlay" onClick={() => !addLoading && setShowAddModal(false)}>
          <div className="admin-modal admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Add New Student</h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setOpenFaceRegistrationAfterAdd(false);
                }}
                disabled={addLoading}
              >
                x
              </button>
            </div>
            <form className="admin-form" onSubmit={handleAddStudent}>
              <label className="admin-form-label">Full Name</label>
              <input
                className="admin-form-input"
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <label className="admin-form-label">Roll Number</label>
              <input
                className="admin-form-input"
                type="text"
                value={addForm.roll_no}
                onChange={(e) => setAddForm((prev) => ({ ...prev, roll_no: e.target.value }))}
                required
              />

              <div className="admin-form-grid-three">
                <div>
                  <label className="admin-form-label">Branch</label>
                  <select
                    className="admin-form-input"
                    value={addForm.branch}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, branch: e.target.value }))}
                  >
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">Semester</label>
                  <select
                    className="admin-form-input"
                    value={addForm.semester}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, semester: e.target.value }))}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">Section</label>
                  <select
                    className="admin-form-input"
                    value={addForm.section}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, section: e.target.value }))}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                  </select>
                </div>
              </div>

              <label className="admin-inline-check">
                <input
                  type="checkbox"
                  checked={openFaceRegistrationAfterAdd}
                  onChange={(e) => setOpenFaceRegistrationAfterAdd(e.target.checked)}
                />
                <span>Add face data now after creating this student</span>
              </label>

              <button className="primary-btn admin-form-submit student-submit-btn" type="submit" disabled={addLoading}>
                {addLoading ? "Adding..." : "Add Student"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default AdminManageStudents;

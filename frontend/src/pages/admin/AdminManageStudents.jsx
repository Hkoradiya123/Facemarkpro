import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus, FaEye, FaPencil, FaTrash, FaCamera
} from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SkeletonBlock } from "../../components/Shared";

const ADMIN_FORM_LABEL_CLASS = "admin-form-label text-base font-medium text-zinc-700 dark:text-ui-text-dark";
const ADMIN_FORM_INPUT_CLASS =
  "admin-form-input w-full min-h-11 rounded-lg border border-[#cbd5e1] bg-white p-[10px_12px] text-base text-[#1f2937] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark";
const ACTION_BTN_VIEW_CLASS =
  "action-btn view-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-purple-200 bg-white text-base text-violet-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:border-ui-border-dark dark:bg-ui-card-dark";
const ACTION_BTN_EDIT_CLASS =
  "action-btn edit-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-amber-100 bg-white text-base text-amber-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:border-ui-border-dark dark:bg-ui-card-dark";
const ACTION_BTN_DELETE_CLASS =
  "action-btn delete-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-red-100 bg-white text-base text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:border-ui-border-dark dark:bg-ui-card-dark";

function StudentsListSkeleton({ rows = 6 }) {
  return (
    <div className="table-wrap skeleton-table-wrap students-table-skeleton-shell w-full max-w-full min-w-0 overflow-auto">
      <table className="admin-table students-table-skeleton-table" aria-hidden="true">
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
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`students-skeleton-row-${rowIndex}`}>
              <td><SkeletonBlock className="skeleton-line students-cell-roll h-3 w-[70%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line students-cell-name h-3 w-[85%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line students-cell-branch h-3 w-[55%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line students-cell-sem h-3 w-[50%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line students-cell-face h-3 w-[60%] rounded-full" /></td>
              <td>
                <div className="students-cell-actions flex items-center gap-2">
                  <SkeletonBlock className="skeleton-block students-action-dot h-9 w-9 rounded-md" />
                  <SkeletonBlock className="skeleton-block students-action-dot h-9 w-9 rounded-md" />
                  <SkeletonBlock className="skeleton-block students-action-wide h-9 w-24 rounded-md" />
                  <SkeletonBlock className="skeleton-block students-action-dot h-9 w-9 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        <div className="admin-table-toolbar mb-5 flex items-center gap-3">
          <input
            type="text"
            className="search-input flex-1 rounded-lg border border-slate-200 bg-white p-[10px_14px] text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none dark:border-ui-border-dark dark:bg-[var(--color-ui-input-bg,#0f172a)] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark"
            placeholder="Search by name, roll number, or branch..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus /> Add Student
          </button>
        </div>

        {actionMessage ? <p className="success-copy mb-3 rounded-md border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.08] p-3 text-sm text-emerald-700">{actionMessage}</p> : null}

        {loading ? (
          <StudentsListSkeleton rows={6} />
        ) : error ? (
          <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{error}</p>
        ) : paginatedStudents.length === 0 ? (
          <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No students found.</p>
        ) : (
          <>
            <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
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
                      <td className="student-roll font-semibold text-slate-800">
                        <strong>{s.roll_no || "—"}</strong>
                      </td>
                      <td className="student-name font-semibold text-slate-800">{s.name || "—"}</td>
                      <td>
                        <span className="dept-badge inline-block rounded-md bg-slate-300 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] text-slate-700">{s.branch || "—"}</span>
                      </td>
                      <td>
                        <span className="semester-badge inline-block rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] text-indigo-700">
                          {s.semester}-{s.section || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`face-badge ${s.face_registered ? "registered" : "missing"} inline-block rounded-full px-2.5 py-1.5 text-xs font-bold ${
                            s.face_registered ? "bg-emerald-500/[0.14] text-emerald-700" : "bg-red-500/[0.14] text-red-700"
                          }`}
                        >
                          {s.face_registered ? "Registered" : "Not Registered"}
                        </span>
                      </td>
                      <td className="action-cell flex flex-nowrap items-center justify-start gap-2 whitespace-nowrap">
                        <button className={ACTION_BTN_VIEW_CLASS} title="View">
                          <FaEye />
                        </button>
                        <button className={ACTION_BTN_EDIT_CLASS} title="Edit">
                          <FaPencil />
                        </button>
                        <button
                          className={`face-text-btn ${s.face_registered ? "reregister" : "add"} inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold leading-none transition-all duration-200 ${
                            s.face_registered
                              ? "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100"
                              : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                          }`}
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
                          className={ACTION_BTN_DELETE_CLASS}
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
              <div className="pagination mt-6 flex items-center justify-center gap-4 pt-5">
                <button
                  className="pagination-btn rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[transform,background,border-color,color,box-shadow] duration-[160ms] hover:-translate-y-px hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info min-w-[140px] text-center text-sm font-medium text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-btn rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[transform,background,border-color,color,box-shadow] duration-[160ms] hover:-translate-y-px hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
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
        <div className="admin-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45 p-5" onClick={closeDeleteConfirm}>
          <div
            className="admin-modal admin-confirm-modal w-[min(460px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header flex items-center justify-between border-b border-slate-200 p-[14px_18px] dark:border-ui-border-dark">
              <h3 className="m-0 text-[1.05rem] text-slate-800 dark:text-ui-text-dark">Confirm Delete</h3>
              <button className="admin-modal-close h-8 w-8 cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-600 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark" onClick={closeDeleteConfirm}>x</button>
            </div>
            <div className="admin-modal-body grid gap-2.5 p-[16px_18px]">
              <p className="admin-confirm-message m-0 text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark">Are you sure you want to delete this student?</p>
              <div className="admin-confirm-actions mt-3.5 flex justify-end gap-2.5">
                <button
                  className="pagination-btn rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                  onClick={closeDeleteConfirm}
                >
                  Cancel
                </button>
                <button
                  className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                  onClick={onConfirmDelete}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddModal ? (
        <div
          className="admin-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45 p-5"
          onClick={() => !addLoading && setShowAddModal(false)}
        >
          <div
            className="admin-modal admin-form-modal w-[min(560px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header flex items-center justify-between border-b border-slate-200 p-[14px_18px] dark:border-ui-border-dark">
              <h3 className="m-0 text-[1.05rem] text-slate-800 dark:text-ui-text-dark">Add New Student</h3>
              <button
                className="admin-modal-close h-8 w-8 cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-600 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark"
                onClick={() => {
                  setShowAddModal(false);
                  setOpenFaceRegistrationAfterAdd(false);
                }}
                disabled={addLoading}
              >
                x
              </button>
            </div>
            <form className="admin-form grid gap-3 p-4" onSubmit={handleAddStudent}>
              <label className={ADMIN_FORM_LABEL_CLASS}>Full Name</label>
              <input
                className={ADMIN_FORM_INPUT_CLASS}
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <label className={ADMIN_FORM_LABEL_CLASS}>Roll Number</label>
              <input
                className={ADMIN_FORM_INPUT_CLASS}
                type="text"
                value={addForm.roll_no}
                onChange={(e) => setAddForm((prev) => ({ ...prev, roll_no: e.target.value }))}
                required
              />

              <div className="admin-form-grid-three grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                <div>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch</label>
                  <select
                    className={ADMIN_FORM_INPUT_CLASS}
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
                  <label className={ADMIN_FORM_LABEL_CLASS}>Semester</label>
                  <select
                    className={ADMIN_FORM_INPUT_CLASS}
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
                  <label className={ADMIN_FORM_LABEL_CLASS}>Section</label>
                  <select
                    className={ADMIN_FORM_INPUT_CLASS}
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

              <label className="admin-inline-check inline-flex items-center gap-2.5 text-[0.95rem] font-semibold text-slate-700 dark:text-ui-text-dark [&>input]:h-4 [&>input]:w-4 [&>input]:accent-blue-600">
                <input
                  type="checkbox"
                  checked={openFaceRegistrationAfterAdd}
                  onChange={(e) => setOpenFaceRegistrationAfterAdd(e.target.checked)}
                />
                <span>Add face data now after creating this student</span>
              </label>

              <button
                className="primary-btn admin-form-submit student-submit-btn mt-1.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.34)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(37,99,235,0.4)]"
                type="submit"
                disabled={addLoading}
              >
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

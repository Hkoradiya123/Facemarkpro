import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlus, FaEye, FaTrash, FaCrown, FaKey
} from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SkeletonBlock } from "../../components/Shared";

const ADMIN_FORM_LABEL_CLASS = "admin-form-label text-base font-medium text-zinc-700 dark:text-ui-text-dark";
const ADMIN_FORM_INPUT_CLASS =
  "admin-form-input w-full min-h-11 rounded-lg border border-[#cbd5e1] bg-white p-[10px_12px] text-base text-[#1f2937] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark";
const ACTION_BTN_BASE = "action-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border bg-white text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ui-card-dark dark:border-ui-border-dark";
const ACTION_BTN_VIEW_CLASS = `${ACTION_BTN_BASE} view-btn border-purple-200 text-violet-600 hover:border-violet-300 hover:bg-violet-50`;
const ACTION_BTN_CROWN_CLASS = `${ACTION_BTN_BASE} crown-btn border-violet-200 text-violet-900 hover:border-violet-300 hover:bg-violet-50`;
const ACTION_BTN_KEY_CLASS = `${ACTION_BTN_BASE} key-btn border-amber-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50`;
const ACTION_BTN_DELETE_CLASS = `${ACTION_BTN_BASE} delete-btn border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50`;
const MODAL_OVERLAY_CLASS = "admin-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45 p-5";
const MODAL_HEADER_CLASS = "admin-modal-header flex items-center justify-between border-b border-slate-200 p-[14px_18px] dark:border-ui-border-dark";
const MODAL_CLOSE_CLASS = "admin-modal-close h-8 w-8 cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-600 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark";
const MODAL_TITLE_CLASS = "m-0 text-[1.05rem] text-slate-800 dark:text-ui-text-dark";
const PAGINATION_BTN_CLASS =
  "pagination-btn rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[transform,background,border-color,color,box-shadow] duration-[160ms] hover:-translate-y-px hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark";
const PRIMARY_BTN_CLASS =
  "primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-70";

function FacultyListSkeleton({ rows = 6 }) {
  return (
    <div className="table-wrap skeleton-table-wrap faculty-table-skeleton-shell w-full max-w-full min-w-0 overflow-auto">
      <table className="admin-table faculty-table-skeleton-table" aria-hidden="true">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`faculty-skeleton-row-${rowIndex}`}>
              <td><SkeletonBlock className="skeleton-line faculty-cell-name h-3 w-[75%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line faculty-cell-email h-3 w-[85%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line faculty-cell-dept h-3 w-[55%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line faculty-cell-role h-3 w-[50%] rounded-full" /></td>
              <td>
                <div className="faculty-cell-actions flex items-center gap-2">
                  <SkeletonBlock className="skeleton-block faculty-action-dot h-9 w-9 rounded-md" />
                  <SkeletonBlock className="skeleton-block faculty-action-dot h-9 w-9 rounded-md" />
                  <SkeletonBlock className="skeleton-block faculty-action-dot h-9 w-9 rounded-md" />
                  <SkeletonBlock className="skeleton-block faculty-action-dot h-9 w-9 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminManageFaculty() {
  const profile = useSessionProfile("admin");
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "123456",
    department: "CSE",
  });
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    actionType: "",
    payload: null,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    loadFaculty();
  }, []);

  async function loadFaculty() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/faculty"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.faculty)) {
        setFaculty(data.faculty);
      } else {
        setError(data.message || "Failed to load faculty");
      }
    } catch (err) {
      console.error("Faculty load error:", err);
      setError("Network error while loading faculty");
    } finally {
      setLoading(false);
    }
  }

  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) =>
      (f.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [faculty, searchQuery]);

  const totalPages = Math.ceil(filteredFaculty.length / itemsPerPage);
  const paginatedFaculty = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFaculty.slice(start, start + itemsPerPage);
  }, [filteredFaculty, currentPage]);

  const executeDelete = async (facultyId) => {
    try {
      setActionLoadingId(facultyId);
      const res = await fetch(apiUrl(`/api/admin/faculty/${facultyId}`), {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFaculty((prev) => prev.filter((f) => f._id !== facultyId));
        setActionMessage("Faculty removed successfully.");
        if (selectedFaculty?._id === facultyId) setSelectedFaculty(null);
      } else {
        setError(data.message || "Failed to delete faculty.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Network error while deleting faculty.");
    } finally {
      setActionLoadingId("");
    }
  };

  const executeToggleAdmin = async (item) => {
    try {
      setActionLoadingId(item._id || "");
      const res = await fetch(apiUrl(`/api/admin/faculty/${item._id}/toggle-admin`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFaculty((prev) =>
          prev.map((f) => (f._id === item._id ? { ...f, role: data.role || f.role } : f))
        );
        setSelectedFaculty((prev) =>
          prev && prev._id === item._id ? { ...prev, role: data.role || prev.role } : prev
        );
        setActionMessage(
          data.role === "super_admin" ? "Faculty promoted to admin." : "Admin access removed."
        );
      } else {
        setError(data.message || "Failed to update role.");
      }
    } catch (err) {
      console.error("Role update error:", err);
      setError("Network error while updating role.");
    } finally {
      setActionLoadingId("");
    }
  };

  const executeResetPassword = async (item) => {
    try {
      setActionLoadingId(item._id || "");
      const res = await fetch(apiUrl(`/api/admin/faculty/${item._id}/reset-password`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setActionMessage("Password reset to 123456.");
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Network error while resetting password.");
    } finally {
      setActionLoadingId("");
    }
  };

  const openConfirm = ({ title, message, actionType, payload }) => {
    setConfirmState({
      open: true,
      title,
      message,
      actionType,
      payload,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      title: "",
      message: "",
      actionType: "",
      payload: null,
    });
  };

  const onConfirmAction = async () => {
    const { actionType, payload } = confirmState;
    closeConfirm();

    if (actionType === "delete-faculty") {
      await executeDelete(payload);
      return;
    }

    if (actionType === "toggle-admin") {
      await executeToggleAdmin(payload);
      return;
    }

    if (actionType === "reset-password") {
      await executeResetPassword(payload);
    }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setError("");
    setActionMessage("");

    if (!addForm.name.trim() || !addForm.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    try {
      setAddLoading(true);
      const res = await fetch(apiUrl("/api/admin/faculty"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: "123456",
          department: addForm.department,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (data.faculty) {
          setFaculty((prev) => [data.faculty, ...prev]);
        } else {
          await loadFaculty();
        }
        setShowAddModal(false);
        setAddForm({ name: "", email: "", password: "123456", department: "CSE" });
        setActionMessage("Faculty added successfully.");
      } else {
        setError(data.message || "Failed to add faculty.");
      }
    } catch (err) {
      console.error("Add faculty error:", err);
      setError("Network error while adding faculty.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <PageShell
      variant="admin"
      nav={adminNav}
      title="Manage Faculty"
      subtitle="Faculty records, department assignment, and role management."
      profile={profile}
      actions={
        <button className={PRIMARY_BTN_CLASS} onClick={() => setShowAddModal(true)}>
          <FaPlus /> Add Faculty
        </button>
      }
    >
      <SectionCard title="Faculty List">
        <div className="admin-table-toolbar mb-5 flex items-center gap-3">
          <input
            type="text"
            className="search-input flex-1 rounded-lg border border-slate-200 bg-white p-[10px_14px] text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {actionMessage ? <p className="success-copy mb-3 rounded-md border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.08] p-3 text-sm text-emerald-700">{actionMessage}</p> : null}

        {loading ? (
          <FacultyListSkeleton rows={6} />
        ) : error ? (
          <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{error}</p>
        ) : paginatedFaculty.length === 0 ? (
          <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No faculty found.</p>
        ) : (
          <>
            <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFaculty.map((f, idx) => (
                    <tr key={f._id || idx}>
                      <td className="faculty-name font-semibold text-slate-800">{f.name || "—"}</td>
                      <td className="faculty-email text-blue-600">
                        <a href={`mailto:${f.email}`} className="text-blue-600 no-underline transition-colors duration-200 hover:text-blue-700 hover:underline">{f.email || "—"}</a>
                      </td>
                      <td>
                        <span className="dept-badge inline-block rounded-md bg-slate-300 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] text-slate-700">{f.department || "—"}</span>
                      </td>
                      <td>
                        <span
                          className={`role-badge ${(f.role || "faculty").toLowerCase()} inline-block rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] ${
                            String(f.role || "").toLowerCase() === "super_admin" ? "bg-blue-100 text-blue-800" : "bg-violet-200 text-violet-800"
                          }`}
                        >
                          {String(f.role || "").toLowerCase() === "super_admin" ? "Admin" : "Faculty"}
                        </span>
                      </td>
                      <td className="action-cell flex flex-nowrap items-center justify-start gap-2 whitespace-nowrap">
                        <button
                          className={ACTION_BTN_VIEW_CLASS}
                          title="View"
                          onClick={() => setSelectedFaculty(f)}
                        >
                          <FaEye />
                        </button>
                        <button
                          className={ACTION_BTN_CROWN_CLASS}
                          title={String(f.role || "").toLowerCase() === "super_admin" ? "Remove Admin" : "Make Admin"}
                          disabled={actionLoadingId === f._id}
                          onClick={() =>
                            openConfirm({
                              title: "Confirm Role Change",
                              message:
                                String(f.role || "").toLowerCase() === "super_admin"
                                  ? "Remove admin access from this faculty member?"
                                  : "Make this faculty member an admin?",
                              actionType: "toggle-admin",
                              payload: f,
                            })
                          }
                        >
                          <FaCrown />
                        </button>
                        <button
                          className={ACTION_BTN_KEY_CLASS}
                          title="Reset password to 123456"
                          disabled={actionLoadingId === f._id}
                          onClick={() =>
                            openConfirm({
                              title: "Confirm Password Reset",
                              message: "Reset password to default 123456 for this faculty member?",
                              actionType: "reset-password",
                              payload: f,
                            })
                          }
                        >
                          <FaKey />
                        </button>
                        <button
                          className={ACTION_BTN_DELETE_CLASS}
                          title="Delete"
                          disabled={actionLoadingId === f._id}
                          onClick={() =>
                            openConfirm({
                              title: "Confirm Delete",
                              message: "Are you sure you want to delete this faculty member?",
                              actionType: "delete-faculty",
                              payload: f._id,
                            })
                          }
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
                  className={PAGINATION_BTN_CLASS}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info min-w-[140px] text-center text-sm font-medium text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={PAGINATION_BTN_CLASS}
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

      {selectedFaculty ? (
        <div className={MODAL_OVERLAY_CLASS} onClick={() => setSelectedFaculty(null)}>
          <div className="admin-modal w-[min(520px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark" onClick={(e) => e.stopPropagation()}>
            <div className={MODAL_HEADER_CLASS}>
              <h3 className={MODAL_TITLE_CLASS}>Faculty Information</h3>
              <button className={MODAL_CLOSE_CLASS} onClick={() => setSelectedFaculty(null)}>x</button>
            </div>
            <div className="admin-modal-body grid gap-2.5 p-[16px_18px]">
              <div className="admin-info-row text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark"><strong className="text-slate-900 dark:text-ui-text-dark">Name:</strong> {selectedFaculty.name || "—"}</div>
              <div className="admin-info-row text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark"><strong className="text-slate-900 dark:text-ui-text-dark">Email:</strong> {selectedFaculty.email || "—"}</div>
              <div className="admin-info-row text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark"><strong className="text-slate-900 dark:text-ui-text-dark">Department:</strong> {selectedFaculty.department || "—"}</div>
              <div className="admin-info-row text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark"><strong className="text-slate-900 dark:text-ui-text-dark">Role:</strong> {String(selectedFaculty.role || "").toLowerCase() === "super_admin" ? "Admin" : "Faculty"}</div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState.open ? (
        <div className={MODAL_OVERLAY_CLASS} onClick={closeConfirm}>
          <div className="admin-modal admin-confirm-modal w-[min(460px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark" onClick={(e) => e.stopPropagation()}>
            <div className={MODAL_HEADER_CLASS}>
              <h3 className={MODAL_TITLE_CLASS}>{confirmState.title || "Confirm Action"}</h3>
              <button className={MODAL_CLOSE_CLASS} onClick={closeConfirm}>x</button>
            </div>
            <div className="admin-modal-body grid gap-2.5 p-[16px_18px]">
              <p className="admin-confirm-message m-0 text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark">{confirmState.message}</p>
              <div className="admin-confirm-actions mt-3.5 flex justify-end gap-2.5">
                <button className={PAGINATION_BTN_CLASS} onClick={closeConfirm}>Cancel</button>
                <button className={PRIMARY_BTN_CLASS} onClick={onConfirmAction}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddModal ? (
        <div className={MODAL_OVERLAY_CLASS} onClick={() => !addLoading && setShowAddModal(false)}>
          <div className="admin-modal admin-form-modal w-[min(560px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark" onClick={(e) => e.stopPropagation()}>
            <div className={MODAL_HEADER_CLASS}>
              <h3 className={MODAL_TITLE_CLASS}>Add New Faculty</h3>
              <button className={MODAL_CLOSE_CLASS} onClick={() => setShowAddModal(false)} disabled={addLoading}>x</button>
            </div>
            <form className="admin-form grid gap-3 p-4" onSubmit={handleAddFaculty}>
              <label className={ADMIN_FORM_LABEL_CLASS}>Full Name</label>
              <input
                className={ADMIN_FORM_INPUT_CLASS}
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <label className={ADMIN_FORM_LABEL_CLASS}>Email Address</label>
              <input
                className={ADMIN_FORM_INPUT_CLASS}
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />

              <label className={ADMIN_FORM_LABEL_CLASS}>Default Password</label>
              <input className={ADMIN_FORM_INPUT_CLASS} type="text" value={addForm.password} readOnly />

              <label className={ADMIN_FORM_LABEL_CLASS}>Department</label>
              <select
                className={ADMIN_FORM_INPUT_CLASS}
                value={addForm.department}
                onChange={(e) => setAddForm((prev) => ({ ...prev, department: e.target.value }))}
              >
                <option value="CSE">CSE (Computer Science)</option>
                <option value="IT">IT (Information Technology)</option>
                <option value="ECE">ECE (Electronics)</option>
                <option value="ME">ME (Mechanical)</option>
                <option value="CE">CE (Civil)</option>
              </select>

              <button className={`${PRIMARY_BTN_CLASS} admin-form-submit mt-1.5 w-full justify-center`} type="submit" disabled={addLoading}>
                {addLoading ? "Creating..." : "Create Faculty"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default AdminManageFaculty;

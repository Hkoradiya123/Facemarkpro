import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlus, FaEye, FaTrash, FaCrown, FaKey
} from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, TableSkeleton } from "../../components/Shared";

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
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Add Faculty
        </button>
      }
    >
      <SectionCard title="Faculty List">
        <div className="admin-table-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {actionMessage ? <p className="success-copy">{actionMessage}</p> : null}

        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <p className="error-copy">{error}</p>
        ) : paginatedFaculty.length === 0 ? (
          <p className="muted-copy">No faculty found.</p>
        ) : (
          <>
            <div className="table-wrap">
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
                      <td className="faculty-name">{f.name || "—"}</td>
                      <td className="faculty-email">
                        <a href={`mailto:${f.email}`}>{f.email || "—"}</a>
                      </td>
                      <td>
                        <span className="dept-badge">{f.department || "—"}</span>
                      </td>
                      <td>
                        <span className={`role-badge ${(f.role || "faculty").toLowerCase()}`}>
                          {String(f.role || "").toLowerCase() === "super_admin" ? "Admin" : "Faculty"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          className="action-btn view-btn"
                          title="View"
                          onClick={() => setSelectedFaculty(f)}
                        >
                          <FaEye />
                        </button>
                        <button
                          className="action-btn crown-btn"
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
                          className="action-btn key-btn"
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
                          className="action-btn delete-btn"
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

      {selectedFaculty ? (
        <div className="admin-modal-overlay" onClick={() => setSelectedFaculty(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Faculty Information</h3>
              <button className="admin-modal-close" onClick={() => setSelectedFaculty(null)}>x</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-info-row"><strong>Name:</strong> {selectedFaculty.name || "—"}</div>
              <div className="admin-info-row"><strong>Email:</strong> {selectedFaculty.email || "—"}</div>
              <div className="admin-info-row"><strong>Department:</strong> {selectedFaculty.department || "—"}</div>
              <div className="admin-info-row"><strong>Role:</strong> {String(selectedFaculty.role || "").toLowerCase() === "super_admin" ? "Admin" : "Faculty"}</div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState.open ? (
        <div className="admin-modal-overlay" onClick={closeConfirm}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{confirmState.title || "Confirm Action"}</h3>
              <button className="admin-modal-close" onClick={closeConfirm}>x</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-confirm-message">{confirmState.message}</p>
              <div className="admin-confirm-actions">
                <button className="pagination-btn" onClick={closeConfirm}>Cancel</button>
                <button className="primary-btn" onClick={onConfirmAction}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddModal ? (
        <div className="admin-modal-overlay" onClick={() => !addLoading && setShowAddModal(false)}>
          <div className="admin-modal admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Add New Faculty</h3>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)} disabled={addLoading}>x</button>
            </div>
            <form className="admin-form" onSubmit={handleAddFaculty}>
              <label className="admin-form-label">Full Name</label>
              <input
                className="admin-form-input"
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <label className="admin-form-label">Email Address</label>
              <input
                className="admin-form-input"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />

              <label className="admin-form-label">Default Password</label>
              <input className="admin-form-input" type="text" value={addForm.password} readOnly />

              <label className="admin-form-label">Department</label>
              <select
                className="admin-form-input"
                value={addForm.department}
                onChange={(e) => setAddForm((prev) => ({ ...prev, department: e.target.value }))}
              >
                <option value="CSE">CSE (Computer Science)</option>
                <option value="IT">IT (Information Technology)</option>
                <option value="ECE">ECE (Electronics)</option>
                <option value="ME">ME (Mechanical)</option>
                <option value="CE">CE (Civil)</option>
              </select>

              <button className="primary-btn admin-form-submit" type="submit" disabled={addLoading}>
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

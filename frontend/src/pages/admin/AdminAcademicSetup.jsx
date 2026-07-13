import React, { useEffect, useMemo, useState } from "react";
import { FaBook, FaBuilding, FaChartLine, FaPencil, FaPlus, FaTrash, FaUsers } from "react-icons/fa6";

import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SkeletonBlock, StatGrid } from "../../components/Shared";

const ADMIN_TABLE_CLASS =
  "admin-table w-full border-separate [border-spacing:0_10px] bg-transparent [&_thead]:bg-transparent dark:[&_thead]:bg-slate-800 dark:[&_thead]:text-slate-300 [&_th]:p-[14px_16px] [&_th]:text-left [&_th]:text-[13px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.3px] [&_th]:text-slate-500 [&_th]:border-b-0 [&_tbody_tr]:transition-transform [&_tbody_tr]:duration-150 [&_tbody_tr:hover]:-translate-y-px [&_td]:border-y [&_td]:border-[#e2e8f0] [&_td]:bg-white [&_td]:p-[14px_16px] [&_td]:text-[14px] [&_td]:text-slate-700 dark:[&_td]:border-ui-border-dark dark:[&_td]:bg-transparent dark:[&_td]:text-ui-text-dark [&_tbody_tr_td:first-child]:rounded-l-[14px] [&_tbody_tr_td:first-child]:border-l [&_tbody_tr_td:last-child]:rounded-r-[14px] [&_tbody_tr_td:last-child]:border-r [&_tbody_tr:hover_td]:bg-[#f8fafc] dark:[&_tbody_tr:hover_td]:bg-slate-800/50";

const TABS = [
  { id: "branches", label: "Branches", singular: "Branch" },
  { id: "classes", label: "Classes", singular: "Class" },
  { id: "classrooms", label: "Classrooms", singular: "Classroom" },
  { id: "subjects", label: "Subjects", singular: "Subject" },
  { id: "assignments", label: "Assignments", singular: "Assignment" },
];

const ADMIN_FORM_LABEL_CLASS = "admin-form-label text-base font-medium text-zinc-700 dark:text-ui-text-dark";
const ADMIN_FORM_INPUT_CLASS =
  "admin-form-input w-full min-h-11 rounded-lg border border-[#cbd5e1] bg-white p-[10px_12px] text-base text-[#1f2937] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark";

const EMPTY_FORMS = {
  branches: { id: "", code: "", name: "", active: true },
  classes: { id: "", branch: "", semester: "", section: "", label: "", active: true },
  classrooms: { id: "", name: "", type: "Classroom", capacity: "", active: true },
  subjects: { id: "", code: "", name: "", branch: "", semester: "", type: "theory", active: true },
  assignments: { id: "", faculty_email: "", branch: "", semester: "", section: "", subject_code: "", classroom: "", active: true, class_value: "" },
};

function AcademicSetupSkeleton({ columns, rows = 6 }) {
  return (
    <div className="table-wrap skeleton-table-wrap setup-table-skeleton-shell w-full max-w-full min-w-0 overflow-auto">
      <table className={`${ADMIN_TABLE_CLASS} setup-table-skeleton-table`} aria-hidden="true">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={`setup-head-${column}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`setup-skeleton-row-${rowIndex}`}>
              {columns.map((column, columnIndex) => (
                <td key={`setup-skeleton-cell-${rowIndex}-${column}`}>
                  {columnIndex === columns.length - 1 ? (
                    <div className="setup-cell-actions flex items-center gap-2">
                      <SkeletonBlock className="skeleton-block setup-action-dot h-9 w-9 rounded-md" />
                      <SkeletonBlock className="skeleton-block setup-action-dot h-9 w-9 rounded-md" />
                    </div>
                  ) : column.toLowerCase().includes("status") ? (
                    <SkeletonBlock className="skeleton-line setup-cell-status h-3 w-[60%] rounded-full" />
                  ) : (
                    <SkeletonBlock className={`skeleton-line h-3 rounded-full${columnIndex === 0 ? " setup-cell-primary w-[75%]" : " setup-cell-regular w-[55%]"}`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAcademicSetup() {
  const profile = useSessionProfile("admin");
  const [activeTab, setActiveTab] = useState("branches");
  const [setup, setSetup] = useState({
    summary: { branches: 0, classes: 0, classrooms: 0, subjects: 0, assignments: 0 },
    branches: [],
    classes: [],
    classrooms: [],
    subjects: [],
    assignments: [],
    faculty_options: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORMS.branches);

  useEffect(() => {
    loadSetup();
  }, []);

  async function loadSetup() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/admin/academic-setup"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        setError(payload.message || payload.error || "Failed to load academic setup.");
        return;
      }
      setSetup({
        summary: payload.summary || { branches: 0, classes: 0, classrooms: 0, subjects: 0, assignments: 0 },
        branches: payload.branches || [],
        classes: payload.classes || [],
        classrooms: payload.classrooms || [],
        subjects: payload.subjects || [],
        assignments: payload.assignments || [],
        faculty_options: payload.faculty_options || [],
      });
    } catch {
      setError("Network error while loading academic setup.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => ([
    { value: String(setup.summary.branches || 0), label: "Branches", tone: "blue", icon: FaBuilding },
    { value: String(setup.summary.classes || 0), label: "Classes", tone: "green", icon: FaUsers },
    { value: String(setup.summary.classrooms || 0), label: "Classrooms", tone: "amber", icon: FaBuilding },
    { value: String(setup.summary.subjects || 0), label: "Subjects", tone: "purple", icon: FaBook },
    { value: String(setup.summary.assignments || 0), label: "Assignments", tone: "cyan", icon: FaChartLine },
  ]), [setup.summary]);

  const classOptions = useMemo(
    () => (setup.classes || []).map((item) => ({
      value: `${item.branch}|${item.semester}|${item.section}`,
      label: item.label || `${item.branch} / ${item.semester} / ${item.section}`,
      branch: item.branch,
      semester: item.semester,
      section: item.section,
    })),
    [setup.classes]
  );

  const branchOptions = useMemo(() => (setup.branches || []).map((item) => item.code), [setup.branches]);
  const classroomOptions = useMemo(() => (setup.classrooms || []).map((item) => item.name), [setup.classrooms]);

  const subjectOptions = useMemo(() => {
    const branch = String(form.branch || "").trim().toUpperCase();
    const semester = String(form.semester || "").trim();
    const items = (setup.subjects || []).filter((item) => {
      if (branch && String(item.branch || "").trim().toUpperCase() !== branch) return false;
      if (semester && String(item.semester ?? "") !== semester) return false;
      return true;
    });
    return items.length ? items : (setup.subjects || []);
  }, [form.branch, form.semester, setup.subjects]);

  const facultyOptions = useMemo(() => setup.faculty_options || [], [setup.faculty_options]);
  const currentItems = setup[activeTab] || [];

  function openCreateModal() {
    setForm({ ...EMPTY_FORMS[activeTab] });
    setModalOpen(true);
    setError("");
    setActionMessage("");
  }

  function openEditModal(item) {
    if (activeTab === "assignments") {
      setForm({
        ...item,
        faculty_email: item.faculty_email || "",
        branch: item.branch || "",
        semester: String(item.semester ?? ""),
        section: item.section || "",
        subject_code: item.subject_code || "",
        classroom: item.classroom || "",
        active: item.active !== false,
        class_value: item.branch && item.semester && item.section ? `${item.branch}|${item.semester}|${item.section}` : "",
      });
    } else {
      setForm({
        ...EMPTY_FORMS[activeTab],
        ...item,
        semester: item?.semester != null ? String(item.semester) : "",
        capacity: item?.capacity != null ? String(item.capacity) : "",
        active: item?.active !== false,
      });
    }
    setModalOpen(true);
    setError("");
    setActionMessage("");
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
    setForm({ ...EMPTY_FORMS[activeTab] });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setActionMessage("");

    try {
      const payload = { ...form };
      if (activeTab === "assignments" && payload.class_value) {
        const [branch, semester, section] = String(payload.class_value).split("|");
        payload.branch = branch || payload.branch;
        payload.semester = semester || payload.semester;
        payload.section = section || payload.section;
      }

      const response = await fetch(apiUrl(`/api/admin/academic-setup/${activeTab}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Save failed");
      }

      await loadSetup();
      setActionMessage(result.message || "Saved successfully.");
      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!item?.id || deletingId) return;
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setActionMessage("");
    try {
      const response = await fetch(apiUrl(`/api/admin/academic-setup/${activeTab}/${item.id}`), {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Delete failed");
      }
      await loadSetup();
      setActionMessage(result.message || "Deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message || "Delete failed.");
    } finally {
      setDeletingId("");
    }
  }

  function renderRows() {
    if (activeTab === "branches") return currentItems.map((item) => [item.code, item.name, item.active ? "Active" : "Inactive", actionButtons(item)]);
    if (activeTab === "classes") return currentItems.map((item) => [item.branch, item.semester, item.section, item.label, item.active ? "Active" : "Inactive", actionButtons(item)]);
    if (activeTab === "classrooms") return currentItems.map((item) => [item.name, item.type || "Classroom", item.capacity || "-", item.active ? "Active" : "Inactive", actionButtons(item)]);
    if (activeTab === "subjects") return currentItems.map((item) => [item.code, item.name, item.branch, item.semester, item.type, item.active ? "Active" : "Inactive", actionButtons(item)]);
    return currentItems.map((item) => [item.faculty_name || item.faculty_email, item.subject_label, item.class_label, item.classroom || "-", item.active ? "Active" : "Inactive", actionButtons(item)]);
  }

  function actionButtons(item) {
    return (
      <div className="academic-setup-actions flex items-center gap-2">
        <button
          type="button"
          className="action-btn view-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-purple-200 bg-white text-base text-violet-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:border-ui-border-dark dark:bg-ui-card-dark"
          onClick={() => openEditModal(item)}
        >
          <FaPencil />
        </button>
        <button
          type="button"
          className="action-btn delete-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-red-100 bg-white text-base text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:border-ui-border-dark dark:bg-ui-card-dark"
          onClick={() => handleDelete(item)}
          disabled={deletingId === item.id}
        >
          <FaTrash />
        </button>
      </div>
    );
  }

  function renderColumns() {
    if (activeTab === "branches") return ["Code", "Name", "Status", "Actions"];
    if (activeTab === "classes") return ["Branch", "Semester", "Section", "Label", "Status", "Actions"];
    if (activeTab === "classrooms") return ["Name", "Type", "Capacity", "Status", "Actions"];
    if (activeTab === "subjects") return ["Code", "Name", "Branch", "Semester", "Type", "Status", "Actions"];
    return ["Faculty", "Subject", "Class", "Classroom", "Status", "Actions"];
  }

  return (
    <PageShell variant="admin" nav={adminNav} title="Academic Setup" subtitle="Manage master data for branches, classes, classrooms, subjects, and faculty assignments." profile={profile}>
      <section className="admin-overview-hero academic-setup-hero grid grid-cols-1 gap-[22px] rounded-[26px] border border-slate-400/[0.26] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(155deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-[26px] shadow-[0_20px_44px_rgba(15,23,42,0.08)] dark:border-ui-border-dark dark:bg-ui-card-dark">
        <div className="admin-overview-hero-copy grid content-start gap-3.5">
          <span className="admin-overview-kicker inline-flex w-fit items-center rounded-full bg-blue-600/10 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-blue-700">Academic Setup</span>
          <h2 className="m-0 text-[clamp(1.9rem,3vw,2.7rem)] leading-[1.05] tracking-[-0.04em] text-slate-900 dark:text-ui-text-dark">Central source of truth for academic structure</h2>
          <p className="m-0 max-w-[58ch] text-base leading-[1.65] text-slate-600 dark:text-ui-text-muted-dark">Keep branches, class groups, rooms, subjects, and faculty-class assignments in one admin-controlled space.</p>
        </div>
      </section>

      <div className="admin-overview-stats my-6 [&_.stats-grid]:mb-0">
        <StatGrid stats={stats} />
      </div>

      <SectionCard title="Setup Manager" className="admin-overview-card rounded-[22px]">
        <div className="academic-setup-toolbar mb-[18px] flex items-center justify-between gap-3.5 max-[992px]:flex-col max-[992px]:items-stretch">
          <div className="academic-setup-tabs flex flex-wrap gap-2.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`academic-setup-tab${activeTab === tab.id ? " active" : ""} cursor-pointer rounded-full border px-3.5 py-2.5 font-bold transition-all duration-200 hover:-translate-y-px ${
                  activeTab === tab.id
                    ? "border-transparent bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_100%)] text-white"
                    : "border-[#dbe4ef] bg-[#f8fbff] text-slate-600 hover:border-blue-300 dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-slate-300"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
            type="button"
            onClick={openCreateModal}
          >
            <FaPlus /> Add {TABS.find((tab) => tab.id === activeTab)?.singular || "Item"}
          </button>
        </div>

        {actionMessage ? <p className="success-copy mb-3 rounded-md border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.08] p-3 text-sm text-emerald-700">{actionMessage}</p> : null}
        {loading ? <AcademicSetupSkeleton rows={6} columns={renderColumns()} /> : error ? <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{error}</p> : (
          currentItems.length ? (
            <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
              <table className={ADMIN_TABLE_CLASS}>
                <thead><tr>{renderColumns().map((column) => <th key={column}>{column}</th>)}</tr></thead>
                <tbody>{renderRows().map((row, rowIndex) => <tr key={`${activeTab}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No {activeTab} added yet.</p>
        )}
      </SectionCard>

      {modalOpen ? (
        <div
          className="admin-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45 p-5"
          onClick={() => !saving && closeModal()}
        >
          <div
            className="admin-modal admin-form-modal academic-setup-modal w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header flex items-center justify-between border-b border-slate-200 p-[14px_18px] dark:border-ui-border-dark">
              <h3 className="m-0 text-[1.05rem] text-slate-800 dark:text-ui-text-dark">{form.id ? "Edit" : "Add"} {TABS.find((tab) => tab.id === activeTab)?.singular || "Item"}</h3>
              <button
                className="admin-modal-close h-8 w-8 cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-600 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                x
              </button>
            </div>
            <form className="admin-form academic-setup-form grid gap-3 p-4" onSubmit={handleSave}>
              {activeTab === "branches" ? (
                <>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch Code</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.code || ""} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch Name</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </>
              ) : null}

              {activeTab === "classes" ? (
                <>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.branch || ""} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} required>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Semester</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} type="number" min="1" max="12" value={form.semester || ""} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Section</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.section || ""} onChange={(event) => setForm((current) => ({ ...current, section: event.target.value.toUpperCase() }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Label</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.label || ""} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="CSE / 5 / A" />
                </>
              ) : null}

              {activeTab === "classrooms" ? (
                <>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Classroom Name</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Type</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.type || ""} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Capacity</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} type="number" min="0" value={form.capacity || ""} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} />
                </>
              ) : null}

              {activeTab === "subjects" ? (
                <>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Subject Code</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.code || ""} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Subject Name</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.branch || ""} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} required>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Semester</label>
                  <input className={ADMIN_FORM_INPUT_CLASS} type="number" min="1" max="12" value={form.semester || ""} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} required />
                  <label className={ADMIN_FORM_LABEL_CLASS}>Type</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.type || "theory"} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option value="theory">Theory</option><option value="lab">Lab</option><option value="tutorial">Tutorial</option></select>
                </>
              ) : null}

              {activeTab === "assignments" ? (
                <>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Faculty</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.faculty_email || ""} onChange={(event) => setForm((current) => ({ ...current, faculty_email: event.target.value }))} required>{facultyOptions.map((item) => <option key={item.email} value={item.email}>{item.label}</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Branch</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.branch || ""} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value, class_value: "", semester: "", section: "", subject_code: "" }))} required>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Class</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.class_value || ""} onChange={(event) => { const selected = classOptions.find((item) => item.value === event.target.value); setForm((current) => ({ ...current, class_value: event.target.value, branch: selected?.branch || current.branch, semester: selected ? String(selected.semester) : "", section: selected?.section || "", subject_code: "" })); }} required>{classOptions.filter((item) => !form.branch || item.branch === form.branch).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Subject</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.subject_code || ""} onChange={(event) => setForm((current) => ({ ...current, subject_code: event.target.value }))} required>{subjectOptions.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}</select>
                  <label className={ADMIN_FORM_LABEL_CLASS}>Classroom</label>
                  <select className={ADMIN_FORM_INPUT_CLASS} value={form.classroom || ""} onChange={(event) => setForm((current) => ({ ...current, classroom: event.target.value }))}><option value="">Not assigned</option>{classroomOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                </>
              ) : null}

              <label className="admin-inline-check inline-flex items-center gap-2.5 text-[0.95rem] font-semibold text-slate-700 dark:text-ui-text-dark [&>input]:h-4 [&>input]:w-4 [&>input]:accent-blue-600">
                <input type="checkbox" checked={form.active !== false} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
                <span>Active</span>
              </label>

              <button
                className="primary-btn admin-form-submit mt-1.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : form.id ? "Save Changes" : "Create"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default AdminAcademicSetup;

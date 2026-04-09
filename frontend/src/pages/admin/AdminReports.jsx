import React, { useEffect, useMemo, useState } from "react";
import { FaFileArrowDown, FaFilter } from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, FilterSkeleton, TableSkeleton } from "../../components/Shared";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

function AdminReports() {
  const profile = useSessionProfile("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: todayIso(),
    end_date: todayIso(),
    subject: "",
    branch: "",
    semester: "",
    section: "",
    faculty_email: "",
    student_roll: "",
  });
  const [options, setOptions] = useState({
    subject_options: [],
    branch_options: [],
    semester_options: [],
    section_options: [],
    faculty_options: [],
  });
  const [report, setReport] = useState({
    summary_rows: [],
    detail_rows: [],
    totals: { total_present: 0, total_absent: 0 },
    subject_summary: [],
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (!filtersLoading) {
      loadReport(filters);
    }
  }, [filtersLoading]);

  async function loadFilterOptions() {
    setFiltersLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/reports/filters"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setOptions({
          subject_options: data.subject_options || [],
          branch_options: data.branch_options || [],
          semester_options: data.semester_options || [],
          section_options: data.section_options || [],
          faculty_options: data.faculty_options || [],
        });
      } else {
        setError(data.message || "Failed to load filter options.");
      }
    } catch (err) {
      console.error("Admin report filters error:", err);
      setError("Network error while loading filter options.");
    } finally {
      setFiltersLoading(false);
    }
  }

  async function loadReport(nextFilters) {
    setLoading(true);
    setError("");
    try {
      const query = buildQuery(nextFilters);
      const res = await fetch(apiUrl(`/api/admin/reports?${query}`), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReport({
          summary_rows: data.summary_rows || [],
          detail_rows: data.detail_rows || [],
          totals: data.totals || { total_present: 0, total_absent: 0 },
          subject_summary: data.subject_summary || [],
        });
      } else {
        setError(data.message || "Failed to load report.");
      }
    } catch (err) {
      console.error("Admin report load error:", err);
      setError("Network error while loading report.");
    } finally {
      setLoading(false);
    }
  }

  const combinedTotal = useMemo(() => {
    return Number(report.totals?.total_present || 0) + Number(report.totals?.total_absent || 0);
  }, [report.totals]);

  const onApplyFilters = () => loadReport(filters);

  const onExport = (format) => {
    const query = buildQuery({ ...filters, format });
    window.open(apiUrl(`/api/admin/reports/export?${query}`), "_blank");
  };

  return (
    <PageShell
      variant="admin"
      nav={adminNav}
      title="Attendance Reports"
      subtitle="Any subject, any faculty, or combined summary across the institution."
      profile={profile}
    >
      <div className="report-page-shell">
      <SectionCard title="Report Filters" className="report-card report-filters-card">
        {filtersLoading ? <FilterSkeleton fields={8} /> : <div className="report-filter-grid report-filter-grid-admin">
          <label className="field-label"><span>Start Date</span><input type="date" value={filters.start_date} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} /></label>
          <label className="field-label"><span>End Date</span><input type="date" value={filters.end_date} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} /></label>
          <label className="field-label"><span>Subject</span><select value={filters.subject} onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value }))}><option value="">All subjects (combined)</option>{options.subject_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label"><span>Faculty</span><select value={filters.faculty_email} onChange={(e) => setFilters((p) => ({ ...p, faculty_email: e.target.value }))}><option value="">All faculty</option>{options.faculty_options.map((f) => <option key={f.email} value={f.email}>{f.name} ({f.email})</option>)}</select></label>
          <label className="field-label"><span>Branch</span><select value={filters.branch} onChange={(e) => setFilters((p) => ({ ...p, branch: e.target.value }))}><option value="">All branches</option>{options.branch_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label"><span>Semester</span><select value={filters.semester} onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}><option value="">All semesters</option>{options.semester_options.map((s) => <option key={String(s)} value={String(s)}>{s}</option>)}</select></label>
          <label className="field-label"><span>Section</span><select value={filters.section} onChange={(e) => setFilters((p) => ({ ...p, section: e.target.value }))}><option value="">All sections</option>{options.section_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label"><span>Student (Roll No)</span><input type="text" placeholder="Optional" value={filters.student_roll} onChange={(e) => setFilters((p) => ({ ...p, student_roll: e.target.value }))} /></label>
        </div>}
        <div className="report-filter-toolbar">
          <div className="report-filter-actions">
            <button className="primary-btn" onClick={onApplyFilters} disabled={loading || filtersLoading}><FaFilter /> Apply Filters</button>
          </div>
          <div className="report-actions">
            <button className="primary-btn" onClick={() => onExport("csv")}><FaFileArrowDown /> Export CSV</button>
            <button className="pagination-btn" onClick={() => onExport("pdf")}><FaFileArrowDown /> Export PDF</button>
          </div>
        </div>
      </SectionCard>

      {error ? <p className="error-copy">{error}</p> : null}

      <div className="report-chip-row">
        <span className="report-chip present">Present: {report.totals?.total_present || 0}</span>
        <span className="report-chip absent">Absent: {report.totals?.total_absent || 0}</span>
        <span className="report-chip total">Total: {combinedTotal}</span>
      </div>

      <div className="content-grid two report-split-grid">
        <SectionCard title="Combined Subject Summary" className="report-card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
              <tbody>
                {report.subject_summary.length ? report.subject_summary.map((row) => (
                  <tr key={row.subject}><td>{row.subject}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.percentage}</td></tr>
                )) : <tr><td colSpan="4">No combined data</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Student Detail" className="report-card">
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th><th>Class</th></tr></thead>
              <tbody>
                {report.detail_rows.length ? report.detail_rows.map((row, idx) => (
                  <tr key={`${row.date}-${idx}`}><td>{row.date}</td><td>{row.subject}</td><td>{row.status}</td><td>{row.branch}-{row.semester}-{row.section}</td></tr>
                )) : <tr><td colSpan="4">Enter student roll to view detail rows</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Summary" className="report-card report-main-table-card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Roll No</th><th>Name</th><th>Branch</th><th>Sem</th><th>Sec</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
              <tbody>
              {loading ? <tr><td colSpan="8"><TableSkeleton rows={4} columns={8} /></td></tr> : report.summary_rows.length ? report.summary_rows.map((row) => (
                <tr key={row.roll_no}><td>{row.roll_no}</td><td>{row.name}</td><td>{row.branch}</td><td>{row.semester}</td><td>{row.section}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.percentage}</td></tr>
              )) : <tr><td colSpan="8">No records found</td></tr>}
              </tbody>
          </table>
        </div>
      </SectionCard>
      </div>
    </PageShell>
  );
}

export default AdminReports;

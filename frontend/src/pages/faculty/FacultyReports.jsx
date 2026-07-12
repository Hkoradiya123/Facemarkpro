import React, { useEffect, useMemo, useState } from "react";
import { FaFileArrowDown, FaFilter } from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell, SectionCard, FilterSkeleton, SkeletonBlock } from "../../components/Shared";

function ReportsSummarySkeleton({ rows = 4 }) {
  return (
    <div className="table-wrap skeleton-table-wrap reports-summary-skeleton-shell">
      <table className="admin-table reports-summary-skeleton-table" aria-hidden="true">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Sem</th>
            <th>Sec</th>
            <th>Present</th>
            <th>Absent</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`faculty-report-skeleton-row-${rowIndex}`}>
              <td><SkeletonBlock className="skeleton-line report-cell-roll h-3 w-[66%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-name h-3 w-[82%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-branch h-3 w-[58%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-num h-3 w-[58%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-num h-3 w-[58%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-num h-3 w-[58%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-num h-3 w-[58%] rounded-full" /></td>
              <td><SkeletonBlock className="skeleton-line report-cell-percent h-3 w-[58%] rounded-full" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

function FacultyReports() {
  const profile = useSessionProfile("faculty");
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
    student_roll: "",
  });
  const [options, setOptions] = useState({
    subject_options: [],
    branch_options: [],
    semester_options: [],
    section_options: [],
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
      const res = await fetch(apiUrl("/api/faculty/reports/filters"), {
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
        });
      } else {
        setError(data.message || "Failed to load filter options.");
      }
    } catch (err) {
      console.error("Faculty report filters error:", err);
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
      const res = await fetch(apiUrl(`/api/faculty/reports?${query}`), {
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
      console.error("Faculty report load error:", err);
      setError("Network error while loading report.");
    } finally {
      setLoading(false);
    }
  }

  const combinedTotal = useMemo(() => {
    return Number(report.totals?.total_present || 0) + Number(report.totals?.total_absent || 0);
  }, [report.totals]);

  const onApplyFilters = () => {
    loadReport(filters);
  };

  const onExport = (format) => {
    const query = buildQuery({ ...filters, format });
    window.open(apiUrl(`/api/faculty/reports/export?${query}`), "_blank");
  };

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Attendance Reports"
      subtitle="Generate reports for your own subjects and classes."
      profile={profile}
    >
      <div className="report-page-shell grid gap-[18px]">
      <SectionCard title="Report Filters" className="report-card report-filters-card">
        {filtersLoading ? <FilterSkeleton fields={7} /> : <div className="report-filter-grid grid grid-cols-4 gap-3.5 max-[992px]:grid-cols-2 max-[640px]:grid-cols-1">
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Start Date</span><input type="date" value={filters.start_date} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]" /></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">End Date</span><input type="date" value={filters.end_date} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]" /></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Subject</span><select value={filters.subject} onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"><option value="">All subjects</option>{options.subject_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Branch</span><select value={filters.branch} onChange={(e) => setFilters((p) => ({ ...p, branch: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"><option value="">All branches</option>{options.branch_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Semester</span><select value={filters.semester} onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"><option value="">All semesters</option>{options.semester_options.map((s) => <option key={String(s)} value={String(s)}>{s}</option>)}</select></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Section</span><select value={filters.section} onChange={(e) => setFilters((p) => ({ ...p, section: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"><option value="">All sections</option>{options.section_options.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="field-label flex flex-col gap-2"><span className="text-[0.9rem] font-semibold text-[#475569]">Student (Roll No)</span><input type="text" placeholder="Optional" value={filters.student_roll} onChange={(e) => setFilters((p) => ({ ...p, student_roll: e.target.value }))} className="w-full min-h-11 rounded-xl border border-[#cbd5e1] bg-white p-[10px_12px] text-[#1f2937] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]" /></label>
        </div>}
        <div className="report-filter-toolbar mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="report-filter-actions flex justify-start">
            <button
              className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={onApplyFilters}
              disabled={loading || filtersLoading}
            >
              <FaFilter /> Apply Filters
            </button>
          </div>
          <div className="report-actions flex flex-wrap gap-2.5">
            <button
              className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
              onClick={() => onExport("csv")}
            >
              <FaFileArrowDown /> Export CSV
            </button>
            <button
              className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
              onClick={() => onExport("pdf")}
            >
              <FaFileArrowDown /> Export PDF
            </button>
          </div>
        </div>
      </SectionCard>

      {error ? <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{error}</p> : null}

      <div className="report-chip-row -mt-0.5 mb-0.5 flex flex-wrap gap-2.5">
        <span className="report-chip present inline-flex items-center rounded-xl bg-blue-500/[0.16] px-3.5 py-2.5 text-[0.9rem] font-bold text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">Present: {report.totals?.total_present || 0}</span>
        <span className="report-chip absent inline-flex items-center rounded-xl bg-red-500/[0.14] px-3.5 py-2.5 text-[0.9rem] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">Absent: {report.totals?.total_absent || 0}</span>
        <span className="report-chip total inline-flex items-center rounded-xl bg-teal-500/[0.14] px-3.5 py-2.5 text-[0.9rem] font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-200">Total: {combinedTotal}</span>
      </div>

      <div className="content-grid two report-split-grid grid grid-cols-2 gap-[18px] max-[992px]:grid-cols-1">
        <SectionCard title="My Subject Summary" className="report-card">
          <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
            <table className="admin-table">
              <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
              <tbody>
                {report.subject_summary.length ? report.subject_summary.map((row) => (
                  <tr key={row.subject}><td>{row.subject}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.percentage}</td></tr>
                )) : <tr><td colSpan="4">No subject data</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Student Detail" className="report-card">
          <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
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
        {loading ? (
          <ReportsSummarySkeleton rows={4} />
        ) : (
          <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
            <table className="admin-table">
              <thead><tr><th>Roll No</th><th>Name</th><th>Branch</th><th>Sem</th><th>Sec</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
              <tbody>
                {report.summary_rows.length ? report.summary_rows.map((row) => (
                  <tr key={row.roll_no}><td>{row.roll_no}</td><td>{row.name}</td><td>{row.branch}</td><td>{row.semester}</td><td>{row.section}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.percentage}</td></tr>
                )) : <tr><td colSpan="8">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default FacultyReports;

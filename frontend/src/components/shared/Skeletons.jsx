import React from "react";

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`skeleton-block relative overflow-hidden bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(90deg,#1e293b_0%,#334155_50%,#1e293b_100%)] ${className}`.trim()}
    />
  );
}

function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  const rowStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div className={`table-wrap skeleton-table-wrap w-full max-w-full min-w-0 overflow-auto ${className}`.trim()}>
      <div className="table-skeleton-grid grid gap-2.5" role="presentation">
        <div className="table-skeleton-row table-skeleton-row-head mb-0.5 grid items-center gap-3" style={rowStyle}>
          {Array.from({ length: columns }, (_, index) => (
            <div key={`head-${index}`} className="table-skeleton-cell min-w-0">
              <SkeletonBlock className="skeleton-line skeleton-cell-head h-[14px] rounded-full w-[80%] h-3" />
            </div>
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="table-skeleton-row grid items-center gap-3" style={rowStyle}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="table-skeleton-cell min-w-0">
                <SkeletonBlock
                  className={`skeleton-line skeleton-cell h-[14px] rounded-full w-full h-3${colIndex === 0 ? " short w-[36%]" : ""}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSkeleton({ fields = 6 }) {
  return (
    <div className="report-filter-grid grid grid-cols-4 gap-3.5 max-[992px]:grid-cols-2 max-[640px]:grid-cols-1">
      {Array.from({ length: fields }, (_, index) => (
        <div key={`filter-${index}`} className="field-label skeleton-filter-item pointer-events-none flex flex-col gap-2">
          <SkeletonBlock className="skeleton-line skeleton-label h-[14px] rounded-full w-[42%] h-3" />
          <SkeletonBlock className="skeleton-input w-full h-[42px] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ variant = "faculty" }) {
  if (variant === "student") {
    return (
      <div className="dashboard-skeleton student mb-[18px]">
        <div className="dashboard-skeleton-stats mb-4 grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`student-stat-${index}`}
              className="dashboard-skeleton-card stat grid min-h-[112px] gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]"
            >
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
            </div>
          ))}
        </div>

        <div className="dashboard-skeleton-grid student-grid grid grid-cols-2 gap-[18px] max-[768px]:grid-cols-1">
          <div className="dashboard-skeleton-card schedule min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
          </div>

          <div className="dashboard-skeleton-card attendance min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
          </div>

          <div className="dashboard-skeleton-card timetable min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
          </div>

          <div className="dashboard-skeleton-card actions min-h-[176px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>

          <div className="dashboard-skeleton-card summary min-h-[176px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-skeleton faculty mb-[18px]">
      <div className="dashboard-skeleton-grid grid grid-cols-2 gap-[18px] max-[768px]:grid-cols-1">
        <div className="dashboard-skeleton-card hero min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
          <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
        </div>
        <div className="dashboard-skeleton-card side min-h-[180px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
          <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
        </div>
        <div className="dashboard-skeleton-card chart min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
        </div>
        <div className="dashboard-skeleton-card table min-h-[180px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
          <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
          <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
        </div>
      </div>
    </div>
  );
}

function FullScreenPortalSkeleton({ variant = "faculty" }) {
  return (
    <div className={`portal-shell portal-loading-screen ${variant} flex min-h-screen overflow-x-hidden bg-ui-bg dark:bg-ui-bg-dark max-[992px]:block`}>
      <aside className="portal-sidebar portal-sidebar-skeleton pointer-events-none fixed inset-y-0 left-0 z-[1200] flex w-[306px] flex-col gap-[18px] overflow-hidden bg-[linear-gradient(145deg,#fff_0%,#f8fafc_100%)] p-[22px_18px_26px] shadow-[2px_0_20px_rgba(0,0,0,0.06)] dark:bg-[linear-gradient(160deg,#111827_0%,#1f2937_100%)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.35)] max-[992px]:relative max-[992px]:w-full max-[992px]:min-h-0 max-[992px]:rounded-b-[20px] max-[992px]:rounded-t-none">
        <div className="sidebar-brand mb-0.5 flex items-center gap-2.5 border-b border-slate-400/20 px-2.5 pb-4 pt-3.5">
          <div className="brand-mark portal-skeleton-square grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-2xl border border-blue-500/[0.18] bg-[linear-gradient(135deg,#f8fbff,#e6f0ff)] dark:border-blue-400/25 dark:bg-[linear-gradient(135deg,#151c2b,#273451)]">
            <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
          </div>
          <div className="portal-skeleton-copy grid flex-1 min-w-0 gap-2.5">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>
        </div>

        <div className="profile-section portal-skeleton-profile mx-0.5 mb-3 flex items-center gap-3 border-b border-slate-400/[0.24] px-3 pb-[18px] pt-4">
          <div className="profile-photo portal-skeleton-avatar grid h-[74px] w-[74px] flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,#6a3f2c,#22130d_72%)]">
            <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
          </div>
          <div className="portal-skeleton-copy grid flex-1 min-w-0 gap-2.5">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>
        </div>

        <div className="nav-links portal-skeleton-nav flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`nav-skeleton-${index}`}
              className={`nav-link portal-skeleton-nav-item flex items-center gap-3.5 rounded-2xl px-[18px] py-3.5 shadow-none ${
                index === 0 ? "active bg-[linear-gradient(135deg,rgba(77,152,219,0.2)_0%,rgba(45,126,210,0.18)_100%)]" : "bg-transparent"
              }`}
            >
              <span className="nav-icon portal-skeleton-icon inline-grid h-[22px] w-[22px] flex-shrink-0 place-items-center overflow-hidden rounded-lg">
                <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
              </span>
              <SkeletonBlock className={`h-[14px] rounded-full ${index === 0 ? "w-[56%]" : "w-[72%]"}`} />
            </div>
          ))}
        </div>

        <div className="sidebar-footer mt-auto">
          <div className="sidebar-footer-row portal-skeleton-footer flex items-center justify-between gap-3 border-t border-slate-400/[0.24] px-1 pb-0.5 pt-4">
            <SkeletonBlock className="portal-skeleton-logout w-[132px] h-12 rounded-2xl" />
            <SkeletonBlock className="portal-skeleton-toggle w-[66px] h-9 rounded-full" />
          </div>
        </div>
      </aside>

      <main className="portal-main portal-main-skeleton ml-[306px] w-[calc(100%-306px)] flex-1 p-[14px_18px_24px] max-[992px]:ml-0 max-[992px]:w-full">
        <header className="page-header portal-skeleton-header mb-5 flex items-start justify-between gap-4">
          <div className="page-heading portal-skeleton-heading flex items-center gap-3.5">
            <div>
              <SkeletonBlock className="skeleton-line portal-skeleton-page-title h-[14px] rounded-full w-[min(340px,42vw)] h-[30px] mb-2.5 max-[640px]:w-full" />
              <SkeletonBlock className="skeleton-line portal-skeleton-page-subtitle h-[14px] rounded-full w-[min(520px,56vw)] h-4 max-[640px]:w-full" />
            </div>
          </div>
          <SkeletonBlock className="portal-skeleton-header-action w-[146px] h-[42px] rounded-xl max-[640px]:w-full" />
        </header>

        <div className="portal-skeleton-dashboard grid gap-5 max-[640px]:gap-4">
          <div className="portal-skeleton-grid top grid grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card wide min-w-0 min-h-[322px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="portal-skeleton-timetable w-full min-h-[220px] rounded-[18px]" />
            </div>
            <div className="portal-skeleton-column grid gap-5">
              <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
                <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                <SkeletonBlock className="portal-skeleton-hero-card w-full min-h-[96px] rounded-[18px]" />
              </div>
              <div className="portal-skeleton-grid compact grid grid-cols-2 gap-[18px]">
                <div className="dashboard-skeleton-card portal-skeleton-card compact min-w-0 min-h-[152px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
                  <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                  <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
                  <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
                </div>
                <div className="dashboard-skeleton-card portal-skeleton-card compact min-w-0 min-h-[152px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
                  <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                  <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
                  <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="portal-skeleton-grid middle grid grid-cols-2 gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-tall w-full h-[150px] rounded-2xl h-[250px]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-medium w-full h-[150px] rounded-2xl h-[210px]" />
            </div>
          </div>

          <div className="portal-skeleton-grid bottom grid grid-cols-[1.05fr_0.8fr_1fr] gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="portal-skeleton-calendar w-full min-h-[180px] rounded-[18px]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
              <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { SkeletonBlock, TableSkeleton, FilterSkeleton, DashboardSkeleton, FullScreenPortalSkeleton };

import React from "react";

function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton-block ${className}`.trim()} />;
}

function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  const rowStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div className={`table-wrap skeleton-table-wrap ${className}`.trim()}>
      <div className="table-skeleton-grid" role="presentation">
        <div className="table-skeleton-row table-skeleton-row-head" style={rowStyle}>
          {Array.from({ length: columns }, (_, index) => (
            <div key={`head-${index}`} className="table-skeleton-cell">
              <SkeletonBlock className="skeleton-line skeleton-cell-head" />
            </div>
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="table-skeleton-row" style={rowStyle}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="table-skeleton-cell">
                <SkeletonBlock className={`skeleton-line skeleton-cell${colIndex === 0 ? " short" : ""}`} />
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
    <div className="report-filter-grid">
      {Array.from({ length: fields }, (_, index) => (
        <div key={`filter-${index}`} className="field-label skeleton-filter-item">
          <SkeletonBlock className="skeleton-line skeleton-label" />
          <SkeletonBlock className="skeleton-input" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ variant = "faculty" }) {
  if (variant === "student") {
    return (
      <div className="dashboard-skeleton student">
        <div className="dashboard-skeleton-stats">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`student-stat-${index}`} className="dashboard-skeleton-card stat">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="skeleton-line skeleton-text short" />
            </div>
          ))}
        </div>

        <div className="dashboard-skeleton-grid student-grid">
          <div className="dashboard-skeleton-card schedule">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars short" />
          </div>

          <div className="dashboard-skeleton-card attendance">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-chart" />
          </div>

          <div className="dashboard-skeleton-card timetable">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-chart" />
          </div>

          <div className="dashboard-skeleton-card actions">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text" />
            <SkeletonBlock className="skeleton-line skeleton-text" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>

          <div className="dashboard-skeleton-card summary">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-skeleton faculty">
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-card hero">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-line skeleton-text" />
          <SkeletonBlock className="skeleton-chart" />
        </div>
        <div className="dashboard-skeleton-card side">
          <SkeletonBlock className="skeleton-line skeleton-title short" />
          <SkeletonBlock className="skeleton-line skeleton-text short" />
          <SkeletonBlock className="skeleton-line skeleton-text" />
        </div>
        <div className="dashboard-skeleton-card chart">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-chart" />
        </div>
        <div className="dashboard-skeleton-card table">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-table-bars" />
          <SkeletonBlock className="skeleton-table-bars" />
          <SkeletonBlock className="skeleton-table-bars short" />
        </div>
      </div>
    </div>
  );
}

function FullScreenPortalSkeleton({ variant = "faculty" }) {
  return (
    <div className={`portal-shell portal-loading-screen ${variant}`}>
      <aside className="portal-sidebar portal-sidebar-skeleton">
        <div className="sidebar-brand">
          <div className="brand-mark portal-skeleton-square">
            <SkeletonBlock className="portal-skeleton-fill" />
          </div>
          <div className="portal-skeleton-copy">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>
        </div>

        <div className="profile-section portal-skeleton-profile">
          <div className="profile-photo portal-skeleton-avatar">
            <SkeletonBlock className="portal-skeleton-fill" />
          </div>
          <div className="portal-skeleton-copy">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>
        </div>

        <div className="nav-links portal-skeleton-nav">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`nav-skeleton-${index}`}
              className={`nav-link portal-skeleton-nav-item${index === 0 ? " active" : ""}`}
            >
              <span className="nav-icon portal-skeleton-icon">
                <SkeletonBlock className="portal-skeleton-fill" />
              </span>
              <SkeletonBlock className={`skeleton-line${index === 0 ? " short" : ""}`} />
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-row portal-skeleton-footer">
            <SkeletonBlock className="portal-skeleton-logout" />
            <SkeletonBlock className="portal-skeleton-toggle" />
          </div>
        </div>
      </aside>

      <main className="portal-main portal-main-skeleton">
        <header className="page-header portal-skeleton-header">
          <div className="page-heading portal-skeleton-heading">
            <div>
              <SkeletonBlock className="skeleton-line portal-skeleton-page-title" />
              <SkeletonBlock className="skeleton-line portal-skeleton-page-subtitle" />
            </div>
          </div>
          <SkeletonBlock className="portal-skeleton-header-action" />
        </header>

        <div className="portal-skeleton-dashboard">
          <div className="portal-skeleton-grid top">
            <div className="dashboard-skeleton-card portal-skeleton-card wide">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="portal-skeleton-timetable" />
            </div>
            <div className="portal-skeleton-column">
              <div className="dashboard-skeleton-card portal-skeleton-card">
                <SkeletonBlock className="skeleton-line skeleton-title short" />
                <SkeletonBlock className="portal-skeleton-hero-card" />
              </div>
              <div className="portal-skeleton-grid compact">
                <div className="dashboard-skeleton-card portal-skeleton-card compact">
                  <SkeletonBlock className="skeleton-line skeleton-title short" />
                  <SkeletonBlock className="skeleton-line skeleton-text short" />
                  <SkeletonBlock className="skeleton-line skeleton-text short" />
                </div>
                <div className="dashboard-skeleton-card portal-skeleton-card compact">
                  <SkeletonBlock className="skeleton-line skeleton-title short" />
                  <SkeletonBlock className="portal-skeleton-widget-bar" />
                  <SkeletonBlock className="skeleton-line skeleton-text" />
                </div>
              </div>
            </div>
          </div>

          <div className="portal-skeleton-grid middle">
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-tall" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-medium" />
            </div>
          </div>

          <div className="portal-skeleton-grid bottom">
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="portal-skeleton-calendar" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
              <SkeletonBlock className="skeleton-line skeleton-text short" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { SkeletonBlock, TableSkeleton, FilterSkeleton, DashboardSkeleton, FullScreenPortalSkeleton };

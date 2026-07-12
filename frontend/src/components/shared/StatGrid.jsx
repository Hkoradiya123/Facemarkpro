import React from "react";

function StatGrid({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="stat-card">
            <div className="stat-copy">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className={`stat-icon tone-${stat.tone}`} aria-hidden="true">
              {Icon ? <Icon /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { StatGrid };

import React from "react";

const TONE_BG = {
  blue: "bg-[#4facfe]/[0.16]",
  green: "bg-emerald-500/[0.16]",
  purple: "bg-[#6c5ce7]/[0.16]",
  amber: "bg-orange-500/[0.18]",
  cyan: "bg-[#17a2b8]/[0.16]",
};

function StatGrid({ stats }) {
  return (
    <div className="stats-grid mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 max-[992px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] max-[992px]:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="stat-card flex items-center justify-between rounded-[18px] bg-ui-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-ui-card-dark max-[992px]:p-[18px]">
            <div className="stat-copy flex flex-col gap-1">
              <strong className="text-[30px] text-ui-text dark:text-ui-text-dark">{stat.value}</strong>
              <span className="text-sm text-ui-text-muted dark:text-ui-text-muted-dark">{stat.label}</span>
            </div>
            <div
              className={`stat-icon tone-${stat.tone} flex h-14 w-14 items-center justify-center rounded-2xl text-white/90 [&>svg]:h-[22px] [&>svg]:w-[22px] ${TONE_BG[stat.tone] || ""}`}
              aria-hidden="true"
            >
              {Icon ? <Icon /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { StatGrid };

import React from "react";

const METRIC_TONE_BEFORE = {
  present: "before:bg-[linear-gradient(90deg,rgba(34,197,94,0.18),rgba(74,222,128,0.28))]",
  absent: "before:bg-[linear-gradient(90deg,rgba(248,113,113,0.18),rgba(252,165,165,0.28))]",
};

function MiniMetricList({ items }) {
  return (
    <div className="mini-metric-list grid gap-3">
      {items.map((item) => {
        const metric = Array.isArray(item)
          ? { label: item[0], value: item[1] }
          : item;
        const label = metric?.label || "";
        const value = metric?.value || "0";
        const fill = Number.isFinite(Number(metric?.fill)) ? Math.max(0, Math.min(100, Number(metric.fill))) : null;
        const tone = metric?.tone ? ` metric-${metric.tone}` : "";

        return (
          <div
            key={label}
            className={`mini-metric-item${fill !== null ? " has-fill" : ""}${tone} relative isolate flex items-center justify-between overflow-hidden rounded-2xl bg-slate-50 p-[12px_14px] before:absolute before:inset-0 before:z-[-1] before:w-[var(--metric-fill,0%)] before:rounded-[inherit] before:transition-[width] before:duration-[420ms] before:content-[''] ${
              METRIC_TONE_BEFORE[metric?.tone] || "before:bg-[linear-gradient(90deg,rgba(59,130,246,0.14),rgba(96,165,250,0.22))]"
            } dark:bg-ui-card-muted-dark`}
            style={fill !== null ? { "--metric-fill": `${fill}%` } : undefined}
          >
            <span className="relative z-[1] text-slate-500 dark:text-ui-text-muted-dark">{label}</span>
            <strong className="relative z-[1] text-xl text-ui-text dark:text-ui-text-dark">{value}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default MiniMetricList;

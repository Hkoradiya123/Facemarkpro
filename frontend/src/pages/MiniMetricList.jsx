import React from "react";

function MiniMetricList({ items }) {
  return (
    <div className="mini-metric-list">
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
            className={`mini-metric-item${fill !== null ? " has-fill" : ""}${tone}`}
            style={fill !== null ? { "--metric-fill": `${fill}%` } : undefined}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default MiniMetricList;

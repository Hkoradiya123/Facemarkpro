import React from "react";

function ProfileFields({ items }) {
  return (
    <div className="profile-fields flex flex-col gap-3.5">
      {items.map(([label, value]) => (
        <div key={label} className="field-row flex justify-between gap-5 border-b border-[#eef2f7] pb-2.5">
          <span className="text-[#64748b]">{label}</span>
          <strong className="text-ui-text dark:text-ui-text-dark">{value}</strong>
        </div>
      ))}
    </div>
  );
}

export { ProfileFields };

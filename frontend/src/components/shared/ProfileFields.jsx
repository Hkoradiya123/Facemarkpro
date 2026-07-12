import React from "react";

function ProfileFields({ items }) {
  return (
    <div className="profile-fields">
      {items.map(([label, value]) => (
        <div key={label} className="field-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export { ProfileFields };

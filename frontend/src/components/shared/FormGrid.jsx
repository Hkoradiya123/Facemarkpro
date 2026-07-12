import React from "react";

function FormGrid({ fields, action }) {
  return (
    <form className="settings-form" onSubmit={(event) => event.preventDefault()}>
      <div className="field-grid">
        {fields.map((field) => (
          <label key={field.label} className="field-label">
            <span>{field.label}</span>
            <input type={field.type} placeholder={field.placeholder || ""} />
          </label>
        ))}
      </div>
      <button className="primary-btn" type="submit">
        {action}
      </button>
    </form>
  );
}

export { FormGrid };

import React from "react";

function FormGrid({ fields, action }) {
  return (
    <form className="settings-form flex flex-col gap-[18px]" onSubmit={(event) => event.preventDefault()}>
      <div className="field-grid grid grid-cols-2 gap-4 max-[992px]:grid-cols-1">
        {fields.map((field) => (
          <label key={field.label} className="field-label flex flex-col gap-2 text-[#475569]">
            <span>{field.label}</span>
            <input
              type={field.type}
              placeholder={field.placeholder || ""}
              className="w-full rounded-xl border border-[#dbe4ee] bg-white px-3.5 py-3"
            />
          </label>
        ))}
      </div>
      <button
        className="primary-btn cursor-pointer rounded-xl border-0 bg-[linear-gradient(135deg,#4facfe,#00c6fb)] px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(79,172,254,0.22)]"
        type="submit"
      >
        {action}
      </button>
    </form>
  );
}

export { FormGrid };

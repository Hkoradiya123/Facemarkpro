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
        className="primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
        type="submit"
      >
        {action}
      </button>
    </form>
  );
}

export { FormGrid };

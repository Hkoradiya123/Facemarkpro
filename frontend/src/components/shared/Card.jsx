import React from "react";

function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`content-card min-w-0 rounded-[18px] bg-ui-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-ui-card-dark max-[992px]:p-[18px] ${className}`}>
      {(title || action) && (
        <div className="section-head mb-[18px] flex items-center justify-between gap-3">
          <h3 className="m-0 text-xl text-ui-text dark:text-ui-text-dark">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export { SectionCard };

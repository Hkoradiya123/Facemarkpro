import React from "react";

function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`content-card ${className}`}>
      {(title || action) && (
        <div className="section-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export { SectionCard };

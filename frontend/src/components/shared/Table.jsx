import React from "react";

function SimpleTable({ columns, rows }) {
  return (
    <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
      <table className="simple-table w-full min-w-0 table-fixed border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[#edf2f7] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] align-middle text-[clamp(10px,1vw,14px)] [overflow-wrap:anywhere] [word-break:break-word]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { SimpleTable };

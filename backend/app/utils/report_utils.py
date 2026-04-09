import csv
from datetime import datetime
from io import StringIO
from typing import List, Tuple

from fpdf import FPDF


def _normalize_date(value: str, default_value: str) -> str:
    """Return a YYYY-MM-DD string, falling back to default on parse errors."""
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return default_value


def normalize_date_range(start_value: str, end_value: str, default_value: str) -> Tuple[str, str]:
    """Normalize a date range and ensure start <= end."""
    start = _normalize_date(start_value, default_value)
    end = _normalize_date(end_value, default_value)
    if start > end:
        start, end = end, start
    return start, end


def build_attendance_report(
    collections,
    start_date: str,
    end_date: str,
    faculty_email: str = None,
    subject: str = None,
    branch: str = None,
    semester: int = None,
    section: str = None,
    student_roll: str = None,
):
    """
    Build attendance summary and optional detail rows for a given date range.
    Returns (summary_rows, detail_rows, totals_dict).
    """
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if faculty_email:
        query["faculty_email"] = faculty_email
    if subject:
        query["subject"] = subject
    if branch:
        query["branch"] = branch
    if semester:
        try:
            query["semester"] = int(semester)
        except Exception:
            query["semester"] = semester
    if section:
        query["section"] = section
    if student_roll:
        query["student.roll_no"] = student_roll

    cursor = collections["attendance"].find(query, {"_id": 0})

    summary = {}
    detail_rows: List[dict] = []
    total_present = 0
    total_absent = 0

    for doc in cursor:
        student = doc.get("student", {})
        roll_no = str(student.get("roll_no", "")).strip()
        if not roll_no:
            continue

        status = student.get("status", "Absent")
        name = student.get("name", "")
        branch_val = doc.get("branch", "")
        semester_val = doc.get("semester", "")
        section_val = doc.get("section", "")
        subject_val = doc.get("subject", "")

        entry = summary.setdefault(
            roll_no,
            {
                "roll_no": roll_no,
                "name": name,
                "branch": branch_val,
                "semester": semester_val,
                "section": section_val,
                "present": 0,
                "absent": 0,
            },
        )

        if status == "Present":
            entry["present"] += 1
            total_present += 1
        else:
            entry["absent"] += 1
            total_absent += 1

        if student_roll and roll_no == student_roll:
            detail_rows.append(
                {
                    "date": doc.get("date", ""),
                    "subject": subject_val,
                    "status": status,
                    "branch": branch_val,
                    "semester": semester_val,
                    "section": section_val,
                }
            )

    summary_rows = []
    for entry in summary.values():
        total = entry["present"] + entry["absent"]
        entry["percentage"] = round((entry["present"] / total) * 100, 2) if total else 0.0
        summary_rows.append(entry)

    summary_rows.sort(key=lambda r: r["roll_no"])
    detail_rows.sort(key=lambda r: r["date"])

    totals = {"total_present": total_present, "total_absent": total_absent}
    return summary_rows, detail_rows, totals


class _SimplePDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 10, self.title, ln=1, align="L")
        self.ln(2)


def export_csv_report(summary_rows, detail_rows, start_date, end_date, filename_prefix="attendance_report"):
    """Return CSV bytes and filename."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Attendance Report", f"{start_date} to {end_date}"])
    writer.writerow([])
    writer.writerow(["Roll No", "Name", "Branch", "Semester", "Section", "Present", "Absent", "Attendance %"])
    for row in summary_rows:
        writer.writerow(
            [
                row.get("roll_no", ""),
                row.get("name", ""),
                row.get("branch", ""),
                row.get("semester", ""),
                row.get("section", ""),
                row.get("present", 0),
                row.get("absent", 0),
                row.get("percentage", 0),
            ]
        )

    if detail_rows:
        writer.writerow([])
        writer.writerow(["Date", "Subject", "Status", "Branch", "Semester", "Section"])
        for d in detail_rows:
            writer.writerow(
                [
                    d.get("date", ""),
                    d.get("subject", ""),
                    d.get("status", ""),
                    d.get("branch", ""),
                    d.get("semester", ""),
                    d.get("section", ""),
                ]
            )

    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"{filename_prefix}_{start_date}_to_{end_date}.csv"
    return csv_bytes, filename


def export_pdf_report(summary_rows, detail_rows, start_date, end_date, filename_prefix="attendance_report"):
    """Return PDF bytes and filename."""
    pdf = _SimplePDF()
    pdf.set_title("Attendance Report")
    pdf.add_page()
    pdf.set_font("Arial", size=11)
    pdf.cell(0, 8, f"Date Range: {start_date} to {end_date}", ln=1)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 10)
    headers = ["Roll", "Name", "Present", "Absent", "%"]
    col_widths = [25, 70, 25, 25, 20]
    for header, width in zip(headers, col_widths):
        pdf.cell(width, 8, header, border=1)
    pdf.ln()

    pdf.set_font("Arial", size=10)
    for row in summary_rows:
        pdf.cell(col_widths[0], 8, str(row.get("roll_no", "")), border=1)
        pdf.cell(col_widths[1], 8, str(row.get("name", ""))[:34], border=1)
        pdf.cell(col_widths[2], 8, str(row.get("present", 0)), border=1, align="C")
        pdf.cell(col_widths[3], 8, str(row.get("absent", 0)), border=1, align="C")
        pdf.cell(col_widths[4], 8, f"{row.get('percentage', 0):.1f}", border=1, align="C")
        pdf.ln()

    if detail_rows:
        pdf.ln(6)
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, "Detail (selected student)", ln=1)
        pdf.set_font("Arial", "B", 9)
        detail_headers = ["Date", "Subject", "Status"]
        detail_widths = [35, 100, 25]
        for header, width in zip(detail_headers, detail_widths):
            pdf.cell(width, 7, header, border=1)
        pdf.ln()

        pdf.set_font("Arial", size=9)
        for d in detail_rows:
            pdf.cell(detail_widths[0], 7, d.get("date", ""), border=1)
            pdf.cell(detail_widths[1], 7, str(d.get("subject", ""))[:44], border=1)
            pdf.cell(detail_widths[2], 7, d.get("status", ""), border=1)
            pdf.ln()

    raw_output = pdf.output(dest="S")
    pdf_bytes = raw_output.encode("latin-1") if isinstance(raw_output, str) else bytes(raw_output)
    filename = f"{filename_prefix}_{start_date}_to_{end_date}.pdf"
    return pdf_bytes, filename

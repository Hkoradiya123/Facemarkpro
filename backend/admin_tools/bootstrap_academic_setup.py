import argparse
import os
from datetime import datetime

from dotenv import load_dotenv
from pymongo import MongoClient


TARGET_COLLECTIONS = {
    "branches": "academic_branches",
    "classes": "academic_classes",
    "classrooms": "academic_classrooms",
    "subjects": "academic_subjects",
    "assignments": "faculty_assignments",
}


def _now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _clean_text(value):
    return str(value or "").strip()


def _norm_upper(value):
    return _clean_text(value).upper()


def _to_int(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except Exception:
        return None


def _slug(value):
    raw = _norm_upper(value)
    chars = []
    prev_underscore = False
    for ch in raw:
        if ch.isalnum():
            chars.append(ch)
            prev_underscore = False
        else:
            if not prev_underscore:
                chars.append("_")
                prev_underscore = True
    out = "".join(chars).strip("_")
    return out or "SUBJECT"


def _subject_code(branch, semester, subject_name):
    base = _slug(subject_name)
    sem = "X" if semester is None else str(semester)
    return f"{_norm_upper(branch)}{sem}_{base}"[:40]


def _build_faculty_lookup(faculty_docs):
    by_email = {}
    by_name = {}
    for doc in faculty_docs:
        email = _clean_text(doc.get("email")).lower()
        name = _clean_text(doc.get("name"))
        if email:
            by_email[email] = doc
        if name:
            by_name[name.lower()] = doc
    return by_email, by_name


def analyze_data(db):
    timetable_docs = list(db["timetable"].find({}, {"_id": 0}))
    faculty_docs = list(db["faculty"].find({}, {"_id": 0, "name": 1, "email": 1}))
    student_docs = list(db["students"].find({}, {"_id": 0, "branch": 1, "semester": 1, "section": 1}))

    faculty_by_email, faculty_by_name = _build_faculty_lookup(faculty_docs)

    branches = {}
    classes = {}
    classrooms = {}
    subjects = {}
    assignments = {}

    now = _now_str()

    for doc in timetable_docs:
        branch = _norm_upper(doc.get("branch"))
        semester = _to_int(doc.get("semester"))
        section = _norm_upper(doc.get("section"))
        subject_name = _clean_text(doc.get("subject"))
        classroom = _clean_text(doc.get("classroom"))

        faculty_email = _clean_text(doc.get("faculty_email")).lower()
        faculty_name = _clean_text(doc.get("faculty_name"))

        if not faculty_email and faculty_name:
            found = faculty_by_name.get(faculty_name.lower())
            if found:
                faculty_email = _clean_text(found.get("email")).lower()

        if faculty_email and not faculty_name:
            found = faculty_by_email.get(faculty_email)
            if found:
                faculty_name = _clean_text(found.get("name"))

        if branch:
            branches[branch] = {
                "code": branch,
                "name": branch,
                "active": True,
                "updated_at": now,
            }

        if branch and semester is not None and section:
            key = (branch, semester, section)
            classes[key] = {
                "branch": branch,
                "semester": semester,
                "section": section,
                "label": f"{branch} / {semester} / {section}",
                "active": True,
                "updated_at": now,
            }

        if classroom:
            classrooms[classroom] = {
                "name": classroom,
                "type": "Classroom",
                "capacity": None,
                "active": True,
                "updated_at": now,
            }

        if branch and semester is not None and subject_name:
            code = _subject_code(branch, semester, subject_name)
            key = (branch, semester, code)
            subjects[key] = {
                "code": code,
                "name": subject_name,
                "branch": branch,
                "semester": semester,
                "type": "theory",
                "active": True,
                "updated_at": now,
            }

            if faculty_email and section:
                assignment_key = (faculty_email, branch, semester, section, code)
                assignments[assignment_key] = {
                    "faculty_email": faculty_email,
                    "faculty_name": faculty_name,
                    "branch": branch,
                    "semester": semester,
                    "section": section,
                    "subject_code": code,
                    "subject_name": subject_name,
                    "classroom": classroom,
                    "active": True,
                    "updated_at": now,
                }

    for doc in student_docs:
        branch = _norm_upper(doc.get("branch"))
        semester = _to_int(doc.get("semester"))
        section = _norm_upper(doc.get("section"))

        if branch and branch not in branches:
            branches[branch] = {
                "code": branch,
                "name": branch,
                "active": True,
                "updated_at": now,
            }

        if branch and semester is not None and section:
            key = (branch, semester, section)
            if key not in classes:
                classes[key] = {
                    "branch": branch,
                    "semester": semester,
                    "section": section,
                    "label": f"{branch} / {semester} / {section}",
                    "active": True,
                    "updated_at": now,
                }

    return {
        "branches": list(branches.values()),
        "classes": list(classes.values()),
        "classrooms": list(classrooms.values()),
        "subjects": list(subjects.values()),
        "assignments": list(assignments.values()),
    }


def _upsert_many(collection, docs, keys, apply_changes):
    inserted_or_updated = 0
    for doc in docs:
        filt = {k: doc[k] for k in keys}
        update = {
            "$set": doc,
            "$setOnInsert": {"created_at": _now_str()},
        }
        if apply_changes:
            collection.update_one(filt, update, upsert=True)
        inserted_or_updated += 1
    return inserted_or_updated


def run(apply_changes=False):
    load_dotenv()

    mongo_uri = os.environ.get("MONGO_URI")
    db_name = os.environ.get("MONGODB_DB", "attendance_db")

    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set. Add it to backend/.env")

    client = MongoClient(mongo_uri)
    db = client[db_name]

    data = analyze_data(db)

    print("Analysis summary:")
    print(f"  Timetable rows: {db['timetable'].count_documents({})}")
    print(f"  Faculty rows:   {db['faculty'].count_documents({})}")
    print(f"  Student rows:   {db['students'].count_documents({})}")
    print(f"  Branches:       {len(data['branches'])}")
    print(f"  Classes:        {len(data['classes'])}")
    print(f"  Classrooms:     {len(data['classrooms'])}")
    print(f"  Subjects:       {len(data['subjects'])}")
    print(f"  Assignments:    {len(data['assignments'])}")

    if not apply_changes:
        print("\nDry run only. Re-run with --apply to upsert data into MongoDB.")
        return

    mapping = {
        "branches": (db[TARGET_COLLECTIONS["branches"]], ("code",)),
        "classes": (db[TARGET_COLLECTIONS["classes"]], ("branch", "semester", "section")),
        "classrooms": (db[TARGET_COLLECTIONS["classrooms"]], ("name",)),
        "subjects": (db[TARGET_COLLECTIONS["subjects"]], ("code",)),
        "assignments": (
            db[TARGET_COLLECTIONS["assignments"]],
            ("faculty_email", "branch", "semester", "section", "subject_code"),
        ),
    }

    print("\nUpserting academic setup data...")
    for key, docs in data.items():
        collection, uniq_keys = mapping[key]
        changed = _upsert_many(collection, docs, uniq_keys, apply_changes=True)
        print(f"  {key}: upserted {changed}")

    print("\nDone. Refresh /admin/academic-setup in the frontend.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Bootstrap academic setup collections from timetable/faculty/students data."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to MongoDB. Without this flag, script runs in dry-run mode.",
    )
    args = parser.parse_args()

    run(apply_changes=args.apply)

import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = os.environ.get("MONGODB_DB", "attendance_db")
FACULTY_FILTER = None  # e.g., "harsh@facemarkpro.com" or None to show all

DAY_ORDER = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}

client = MongoClient(MONGO_URI)
col = client[DB_NAME]["timetable"]

query = {}
if FACULTY_FILTER:
    query["faculty_email"] = FACULTY_FILTER.lower()

docs = list(col.find(query, {"_id": 0}))
docs.sort(key=lambda d: (DAY_ORDER.get(d.get("day"), 99), d.get("period_no", 0), d.get("start_time", "")))

current_day = None
for d in docs:
    day = d.get("day", "?")
    if day != current_day:
        print(f"\n=== {day} ===")
        current_day = day
    print(
        f"P{d.get('period_no')} {d.get('start_time')}-{d.get('end_time')} "
        f"{d.get('subject')} | {d.get('classroom')} | Sem {d.get('semester')} "
        f"{d.get('branch')}{d.get('section')} | faculty={d.get('faculty_email', d.get('faculty_name'))}"
    )
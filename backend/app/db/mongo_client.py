from pymongo import MongoClient
import os

client = None
db = None
attendance_col = None
students_col = None
users_collection = None

def init_mongo_client(app):
    global client, db, attendance_col, students_col, users_collection
    
    mongodb_uri = os.environ.get('MONGO_URI')
    mongodb_db = os.environ.get('MONGODB_DB', 'attendance_db')

    if not mongodb_uri:
        raise ValueError("Please set MONGO_URI environment variable for MongoDB Atlas")

    client = MongoClient(mongodb_uri)
    db = client[mongodb_db]
    attendance_col = db["attendance"]
    students_col = db["students"]
    users_collection = db["faculty"]
    calendar_events_col = db["faculty_calendar_events"]

    # Ensure unique key to avoid duplicate attendance entries per student/class/date
    try:
        attendance_col.create_index(
            [
                ("date", 1),
                ("subject", 1),
                ("faculty_email", 1),
                ("branch", 1),
                ("semester", 1),
                ("section", 1),
                ("student.roll_no", 1)
            ],
            name="uniq_attendance_student_day",
            unique=True
        )
    except Exception:
        pass

    # Add indexes for dashboard queries - these are critical for performance
    try:
        # Attendance indexes
        attendance_col.create_index([("faculty_email", 1), ("date", 1)])
        attendance_col.create_index([("faculty_email", 1), ("student.status", 1)])
        attendance_col.create_index([("faculty_email", 1), ("date", 1), ("student.status", 1)])
        attendance_col.create_index([("date", 1), ("faculty_email", 1), ("branch", 1), ("semester", 1), ("section", 1)])
        
        # Timetable index
        db['timetable'].create_index([("faculty_email", 1), ("day", 1)])
        
        # Students index
        db['students'].create_index([("branch", 1), ("semester", 1), ("section", 1)])

        # Faculty calendar indexes
        calendar_events_col.create_index([("faculty_email", 1), ("date_key", 1)])
        calendar_events_col.create_index([("faculty_email", 1), ("event_id", 1)], unique=True)
    except Exception:
        pass

    app.mongo_client = client
    app.db = db
    app.attendance_col = attendance_col
    app.students_col = students_col
    app.users_collection = users_collection

def get_collections():
    if client is None:
        raise ValueError("Mongo client not initialized. Call init_mongo_client(app) first.")
    return {
        "faculty": db["faculty"],
        "students": db["students"],
        "attendance": db["attendance"],
        "users": db["users"],
        "timetable": db["timetable"],
        "faculty_layouts": db["faculty_layouts"],
        "faculty_calendar_events": db["faculty_calendar_events"],
        "academic_branches": db["academic_branches"],
        "academic_classes": db["academic_classes"],
        "academic_classrooms": db["academic_classrooms"],
        "academic_subjects": db["academic_subjects"],
        "faculty_assignments": db["faculty_assignments"],
    }

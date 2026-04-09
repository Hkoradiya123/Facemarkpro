import base64
import io
import logging
import os
import time
from datetime import datetime, timedelta
from threading import Lock

import bcrypt
import numpy as np
import pandas as pd
from PIL import Image
from flask import Blueprint, current_app, jsonify, request
from itsdangerous import BadSignature, BadTimeSignature, URLSafeTimedSerializer

from ..db.mongo_client import get_collections
from ..services.attendance import AttendanceService
from ..services.face_recognition import get_face_recognition_service
from ..utils.cloudinary_utils import get_pickle_from_cloudinary

bp = Blueprint('mobile_api', __name__, url_prefix='/api/mobile')
logger = logging.getLogger(__name__)

mobile_live_sessions = {}
mobile_session_lock = Lock()


def _json_error(message, status=400):
    return jsonify({'success': False, 'error': message}), status


def _get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='mobile-api-auth')


def _create_token(payload):
    return _get_serializer().dumps(payload)


def _read_token(max_age=7 * 24 * 60 * 60):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1].strip()
    if not token:
        return None

    try:
        return _get_serializer().loads(token, max_age=max_age)
    except (BadSignature, BadTimeSignature):
        return None


def _require_auth(expected_role=None):
    payload = _read_token()
    if not payload:
        return None, _json_error('Unauthorized', 401)

    role = payload.get('role')
    if expected_role == 'faculty' and role not in {'faculty', 'teacher', 'super_admin'}:
        return None, _json_error('Forbidden', 403)
    if expected_role == 'student' and role != expected_role:
        return None, _json_error('Forbidden', 403)

    return payload, None


def _get_faculty_identity(faculty_email):
    collections = get_collections()
    doc = collections['faculty'].find_one({'email': faculty_email})
    if doc and doc.get('name'):
        return str(doc.get('name')).strip().lower()
    return None


def _find_lecture(branch, semester, faculty_email, faculty_name=None):
    faculty_name = faculty_name or _get_faculty_identity(faculty_email)
    collections = get_collections()
    try:
        sem_value = int(semester)
    except Exception:
        sem_value = semester

    query = {
        'branch': branch,
        'semester': sem_value,
        '$or': [{'faculty_email': faculty_email}]
    }
    if faculty_name:
        query['$or'].append({'faculty_name': faculty_name})
    return collections['timetable'].find_one(query, {'_id': 0})


def _get_todays_lectures(faculty_email):
    faculty_name = _get_faculty_identity(faculty_email)
    collections = get_collections()
    today = datetime.now().strftime('%A')
    query = {
        'day': today,
        '$or': [{'faculty_email': faculty_email}]
    }
    if faculty_name:
        query['$or'].append({'faculty_name': faculty_name})

    lectures = list(collections['timetable'].find(query, {'_id': 0}))
    for lecture in lectures:
        lecture['id'] = f"{lecture.get('branch', '')}_{lecture.get('semester', '')}"
    return lectures


def _build_student_dashboard(student):
    cols = get_collections()
    roll_no = student.get('roll_no')
    branch = student.get('branch', '')
    semester = str(student.get('semester', ''))
    section = student.get('section', 'A')

    timetable_path = current_app.config.get('TIMETABLE_FILE', 'timetable.csv')
    df = pd.read_csv(timetable_path) if os.path.exists(timetable_path) else pd.DataFrame()
    today_classes = []
    attendance_stats = {}
    recent_attendance = []
    weekly_attendance = {}

    if not df.empty:
        today = pd.Timestamp.now().strftime('%A')
        class_df = df[
            (df['branch'] == branch) &
            (df['semester'].astype(str) == semester) &
            (df['section'] == section) &
            (df['day'] == today)
        ]
        today_classes = class_df.to_dict(orient='records')

    subjects = {c.get('subject') for c in today_classes if c.get('subject')}
    for doc in cols['attendance'].find({"student.roll_no": roll_no}):
        if doc.get('subject'):
            subjects.add(doc['subject'])

    for subject in subjects:
        total = cols['attendance'].count_documents({"student.roll_no": roll_no, "subject": subject})
        present = cols['attendance'].count_documents({
            "student.roll_no": roll_no,
            "subject": subject,
            "student.status": "Present"
        })
        percentage = int(round((present / total) * 100)) if total > 0 else 0
        attendance_stats[subject] = {
            "total": total,
            "present": present,
            "percentage": percentage
        }

    recent_cursor = cols['attendance'].find({"student.roll_no": roll_no}).sort("_id", -1).limit(10)
    for record in recent_cursor:
        recent_attendance.append({
            'subject': record.get('subject', ''),
            'date': record.get('date', ''),
            'status': record.get('student', {}).get('status', '')
        })

    timetable_subjects = []
    if not df.empty:
        student_timetable = df[
            (df['branch'] == branch) &
            (df['semester'].astype(str) == semester) &
            (df['section'] == section)
        ]
        timetable_subjects = student_timetable['subject'].drop_duplicates().tolist()

    week_ago = datetime.now() - timedelta(days=7)
    for subject in timetable_subjects:
        weekly_docs = cols['attendance'].find({
            "student.roll_no": roll_no,
            "subject": subject,
            "date": {"$gte": week_ago.strftime("%Y-%m-%d")}
        })

        total_weekly = 0
        present_weekly = 0
        for doc in weekly_docs:
            total_weekly += 1
            if doc.get('student', {}).get('status') == 'Present':
                present_weekly += 1

        if total_weekly > 0:
            weekly_attendance[subject] = {
                "present": present_weekly,
                "absent": total_weekly - present_weekly,
                "total": total_weekly
            }

    overall_total = sum(item['total'] for item in attendance_stats.values())
    overall_present = sum(item['present'] for item in attendance_stats.values())
    overall_absent = overall_total - overall_present
    overall_percentage = int(round((overall_present / overall_total) * 100)) if overall_total > 0 else 0

    return {
        'student': {
            'name': student.get('name', 'Student'),
            'roll_no': roll_no,
            'branch': branch,
            'semester': semester,
            'section': section
        },
        'today_classes': today_classes,
        'attendance_stats': attendance_stats,
        'recent_attendance': recent_attendance,
        'weekly_attendance': weekly_attendance,
        'overall_percentage': overall_percentage,
        'overall_stats': {
            'total_present': overall_present,
            'total_absent': overall_absent
        }
    }


@bp.get('/health')
def mobile_health():
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'FaceMarkPro Mobile API',
        'version': 'v1'
    }), 200


@bp.get('/meta')
def mobile_meta():
    return jsonify({
        'success': True,
        'auth': 'bearer-token',
        'platforms': ['android', 'ios'],
        'endpoints': {
            'faculty_login': '/api/mobile/auth/faculty/login',
            'student_login': '/api/mobile/auth/student/login',
            'faculty_classes': '/api/mobile/faculty/classes',
            'attendance_start': '/api/mobile/attendance/start',
            'attendance_frame': '/api/mobile/attendance/frame',
            'attendance_stop': '/api/mobile/attendance/stop',
            'student_dashboard': '/api/mobile/student/dashboard'
        }
    }), 200


@bp.post('/auth/faculty/login')
def mobile_faculty_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return _json_error('Email and password are required')

    collections = get_collections()
    user = collections['faculty'].find_one({'email': email})
    if not user:
        return _json_error('Invalid email or password', 401)

    hashed_password = user.get('password')
    if not isinstance(hashed_password, (bytes, bytearray)) or not bcrypt.checkpw(password.encode('utf-8'), hashed_password):
        return _json_error('Invalid email or password', 401)

    role = str(user.get('role', 'teacher') or 'teacher')

    token = _create_token({
        'role': role,
        'email': email,
        'name': user.get('name', 'Faculty')
    })

    return jsonify({
        'success': True,
        'token': token,
        'dashboard_path': '/admin/dashboard' if role == 'super_admin' else '/faculty/dashboard',
        'user': {
            'role': role,
            'email': email,
            'name': user.get('name', 'Faculty')
        }
    })


@bp.post('/auth/student/login')
def mobile_student_login():
    data = request.get_json(silent=True) or {}
    roll_no = str(data.get('roll_no', '')).strip()
    password = data.get('password', '')

    if not roll_no or not password:
        return _json_error('Roll number and password are required')

    collections = get_collections()
    user = collections['students'].find_one({'roll_no': roll_no})
    if not user:
        return _json_error('Invalid roll number or password', 401)

    hashed_password = user.get('password')
    if not isinstance(hashed_password, (bytes, bytearray)) or not bcrypt.checkpw(password.encode('utf-8'), hashed_password):
        return _json_error('Invalid roll number or password', 401)

    token = _create_token({
        'role': 'student',
        'roll_no': roll_no,
        'name': user.get('name', 'Student')
    })

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'role': 'student',
            'roll_no': roll_no,
            'name': user.get('name', 'Student')
        }
    })


@bp.get('/faculty/classes')
def mobile_faculty_classes():
    auth, error = _require_auth('faculty')
    if error:
        return error

    lectures = _get_todays_lectures(auth['email'])
    return jsonify({
        'success': True,
        'classes': lectures
    })


@bp.post('/attendance/start')
def mobile_attendance_start():
    auth, error = _require_auth('faculty')
    if error:
        return error

    data = request.get_json(silent=True) or {}
    class_id = str(data.get('class_id', '')).strip()
    if not class_id:
        return _json_error('class_id is required')

    cloud_data = get_pickle_from_cloudinary(class_id)
    if not cloud_data:
        return _json_error('Encoding file not found for this class', 404)

    try:
        known_encodings = np.array(cloud_data['encodings'])
        known_metadata = cloud_data.get('metadata', [])
    except Exception as exc:
        logger.error(f"Error parsing mobile encoding data for {class_id}: {exc}")
        return _json_error('Error parsing face data', 500)

    if len(known_encodings) == 0:
        return _json_error('No face encodings found for this class', 404)

    try:
        face_service = get_face_recognition_service()
    except Exception as exc:
        logger.error(f"Failed to initialize mobile face service: {exc}")
        return _json_error('Failed to initialize face recognition service', 500)

    session_id = f"mobile_{auth['email']}_{class_id}_{int(time.time())}"
    with mobile_session_lock:
        mobile_live_sessions[session_id] = {
            'faculty_email': auth['email'],
            'class_id': class_id,
            'face_service': face_service,
            'known_encodings': known_encodings,
            'known_metadata': known_metadata,
            'recognized_students': set(),
            'created_at': time.time(),
            'is_active': True
        }

    return jsonify({
        'success': True,
        'session_id': session_id,
        'known_faces': len(known_encodings)
    })


@bp.post('/attendance/frame')
def mobile_attendance_frame():
    auth, error = _require_auth('faculty')
    if error:
        return error

    data = request.get_json(silent=True) or {}
    session_id = str(data.get('session_id', '')).strip()
    frame_data = data.get('frame')

    if not session_id or not frame_data:
        return _json_error('session_id and frame are required')

    with mobile_session_lock:
        session_data = mobile_live_sessions.get(session_id)
        if not session_data or not session_data.get('is_active'):
            return _json_error('Session not found or inactive', 404)
        if session_data.get('faculty_email') != auth['email']:
            return _json_error('Forbidden', 403)

        known_encodings = session_data['known_encodings']
        known_metadata = session_data['known_metadata']
        face_service = session_data['face_service']

    try:
        img_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        frame = np.array(img)
        frame_scale = float(os.environ.get('LIVE_FRAME_SCALE', '0.5'))
        if frame_scale < 1.0:
            import cv2
            frame = cv2.resize(frame, (0, 0), fx=frame_scale, fy=frame_scale)
    except Exception as exc:
        return _json_error(f'Invalid frame data: {exc}', 400)

    try:
        recognized_results = face_service.recognize_faces_in_frame(
            frame,
            known_encodings,
            known_metadata,
            float(os.environ.get('FACE_RECOGNITION_TOLERANCE', 0.85))
        )
    except Exception as exc:
        logger.exception(f"Mobile frame processing error: {exc}")
        return _json_error(f'Processing error: {exc}', 500)

    recognized_in_frame = []
    recognized_ids = set()
    for result in recognized_results:
        roll_no = result.get('roll_no', '')
        name = result.get('name', '')
        distance = result.get('distance', 0)
        student_id = f"{roll_no}_{name}" if roll_no else name
        recognized_ids.add(student_id)
        recognized_in_frame.append({
            'student_id': student_id,
            'roll_no': roll_no,
            'name': name,
            'distance': distance
        })

    with mobile_session_lock:
        if session_id in mobile_live_sessions:
            mobile_live_sessions[session_id]['recognized_students'].update(recognized_ids)
            total_recognized = len(mobile_live_sessions[session_id]['recognized_students'])
        else:
            total_recognized = len(recognized_ids)

    return jsonify({
        'success': True,
        'recognized_in_frame': recognized_in_frame,
        'total_recognized': total_recognized
    })


@bp.post('/attendance/stop')
def mobile_attendance_stop():
    auth, error = _require_auth('faculty')
    if error:
        return error

    data = request.get_json(silent=True) or {}
    session_id = str(data.get('session_id', '')).strip()
    if not session_id:
        return _json_error('session_id is required')

    with mobile_session_lock:
        session_data = mobile_live_sessions.get(session_id)
        if not session_data:
            return _json_error('Session not found', 404)
        if session_data.get('faculty_email') != auth['email']:
            return _json_error('Forbidden', 403)
        session_data['is_active'] = False
        recognized_students = list(session_data['recognized_students'])
        class_id = session_data['class_id']

    faculty_name = _get_faculty_identity(auth['email'])
    branch, semester = class_id.split('_')
    lecture = _find_lecture(branch, semester, auth['email'], faculty_name)
    if not lecture:
        return _json_error('Lecture info not found', 404)

    subject = lecture.get('subject')
    section = lecture.get('section')
    classroom = lecture.get('classroom')
    date_str = datetime.now().strftime('%Y-%m-%d')
    collections = get_collections()
    attendance_service = AttendanceService()

    saved_present = []
    present_roll_nos = set()
    for student_id in recognized_students:
        if '_' in student_id:
            roll_no, name = student_id.split('_', 1)
        else:
            roll_no = ''
            name = student_id

        present_roll_nos.add(roll_no)
        collections['attendance'].update_one(
            {
                'date': date_str,
                'subject': subject,
                'faculty_email': auth['email'],
                'branch': branch,
                'semester': int(semester),
                'section': section,
                'student.roll_no': roll_no
            },
            {
                '$set': {
                    'date': date_str,
                    'subject': subject,
                    'faculty_email': auth['email'],
                    'classroom': classroom,
                    'branch': branch,
                    'semester': int(semester),
                    'section': section,
                    'student': {
                        'roll_no': roll_no,
                        'name': name,
                        'status': 'Present'
                    }
                }
            },
            upsert=True
        )
        saved_present.append({'roll_no': roll_no, 'name': name, 'status': 'Present'})

    absent_students = []
    all_students = attendance_service.get_students_for_class(branch, semester, section)
    for student in all_students:
        if student['roll_no'] not in present_roll_nos:
            collections['attendance'].update_one(
                {
                    'date': date_str,
                    'subject': subject,
                    'faculty_email': auth['email'],
                    'branch': branch,
                    'semester': int(semester),
                    'section': section,
                    'student.roll_no': student['roll_no']
                },
                {
                    '$set': {
                        'date': date_str,
                        'subject': subject,
                        'faculty_email': auth['email'],
                        'classroom': classroom,
                        'branch': branch,
                        'semester': int(semester),
                        'section': section,
                        'student': {
                            'roll_no': student['roll_no'],
                            'name': student['name'],
                            'status': 'Absent'
                        }
                    }
                },
                upsert=True
            )
            absent_students.append({
                'roll_no': student['roll_no'],
                'name': student['name'],
                'status': 'Absent'
            })

    with mobile_session_lock:
        mobile_live_sessions.pop(session_id, None)

    return jsonify({
        'success': True,
        'lecture': lecture,
        'present_students': saved_present,
        'absent_students': absent_students,
        'present_count': len(saved_present),
        'absent_count': len(absent_students)
    })


@bp.get('/student/dashboard')
def mobile_student_dashboard():
    auth, error = _require_auth('student')
    if error:
        return error

    cols = get_collections()
    student = cols['students'].find_one({'roll_no': auth['roll_no']})
    if not student:
        return _json_error('Student not found', 404)

    return jsonify({
        'success': True,
        'dashboard': _build_student_dashboard(student)
    })

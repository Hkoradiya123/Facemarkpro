from flask import Blueprint, jsonify, render_template, request, flash, redirect, url_for, session, current_app, make_response
import bcrypt
import re
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from ..db.mongo_client import get_collections
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename
from io import BytesIO
from PIL import Image
from app.utils.report_utils import (
    build_attendance_report,
    export_csv_report,
    export_pdf_report,
    normalize_date_range,
)
from ..utils.api_contract import build_auth_response, wants_json_response

load_dotenv()  # Loads variables from .env

bp = Blueprint('faculty', __name__)


import cloudinary
import cloudinary.uploader

@bp.app_context_processor
def inject_faculty_photo():
    """Provide photo_path, email, and faculty name to all faculty templates for sidebar/profile."""
    default_photo = 'img/faculty.jpg'
    # Helper to resolve photo URL
    def resolve_photo_url(path):
        if not path:
            return url_for('static', filename=default_photo)
        if path.startswith('http') or path.startswith('https'):
            return path
        return url_for('static', filename=path)

    faculty_email = session.get('faculty_email')
    if not faculty_email:
        return {
            'photo_path': url_for('static', filename=default_photo),
            'is_admin': False,
            'email': '',
            'faculty': 'Faculty'
        }

    try:
        collections = get_collections()
        user = collections['faculty'].find_one({'email': faculty_email})
        if not user:
            return {
                'photo_path': url_for('static', filename=default_photo),
                'is_admin': False,
                'email': faculty_email,
                'faculty': 'Faculty'
            }
        
        raw_path = user.get('photo_path', default_photo)
        faculty_name = user.get('name', faculty_email.split('@')[0].title())
        return {
            'photo_path': resolve_photo_url(raw_path),
            'is_admin': user.get('role') == 'super_admin',
            'email': faculty_email,
            'faculty': faculty_name
        }
    except Exception:
        return {
            'photo_path': url_for('static', filename=default_photo),
            'is_admin': False,
            'email': faculty_email if faculty_email else '',
            'faculty': 'Faculty'
        }


def _get_faculty_filter_options(collections, faculty_email, faculty_name_lower):
    """Return subject and class options from timetable for this faculty."""
    query = {"$or": [{"faculty_email": faculty_email}, {"faculty_name": faculty_name_lower}]}
    docs = list(collections['timetable'].find(query, {"_id": 0}))

    subjects = sorted({doc.get("subject", "") for doc in docs if doc.get("subject")})

    class_set = set()
    for doc in docs:
        branch = doc.get("branch", "")
        semester_val = doc.get("semester")
        section = doc.get("section", "")
        try:
            semester_int = int(semester_val) if semester_val is not None else None
        except Exception:
            semester_int = semester_val

        if branch and semester_int is not None and section:
            class_set.add((branch, semester_int, section))

    class_options = [
        {"branch": b, "semester": s, "section": sec}
        for (b, s, sec) in sorted(class_set, key=lambda x: (x[0], x[1], x[2]))
    ]

    return subjects, class_options

# --------------------------------------------------------------------
# FACULTY INFO EDIT
# --------------------------------------------------------------------
@bp.route('/edit-faculty-info', methods=['POST'])
def edit_faculty_info():
    """Edit faculty info: phone, qualification, address, with password confirmation"""
    collections = get_collections()
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')
    phone = request.form.get('phone', '')
    qualification = request.form.get('qualification', '')
    address = request.form.get('address', '')

    # 🔧 Changed from 'users' → 'faculty'
    user = collections['faculty'].find_one({"email": email})
    if not user:
        flash("Faculty not found.", "error")
        return redirect('/profile')

    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        flash("Password incorrect.", "error")
        return redirect('/profile')

    update_fields = {}
    if phone:
        update_fields['phone'] = phone
    if qualification:
        update_fields['qualification'] = qualification
    if address:
        update_fields['address'] = address

    if update_fields:
        collections['faculty'].update_one({"email": email}, {"$set": update_fields})
        flash("Faculty info updated successfully.", "success")
    else:
        flash("No changes submitted.", "info")
    return redirect('/profile')


# --------------------------------------------------------------------
# LOGIN / LOGOUT / HOME
# --------------------------------------------------------------------
@bp.route('/')
def home():
    """Home route - redirect to dashboard if logged in, otherwise to login"""
    if 'faculty_email' in session:
        return redirect('/dashboard')
    return redirect('/multilogin')


@bp.route('/multilogin')
def multilogin():
    """Multi-login page"""
    if 'faculty_email' in session:
        return redirect('/dashboard')
    if wants_json_response():
        return jsonify({'success': True, 'message': 'login-required'}), 200
    return render_template('multilogin.html')


@bp.route('/login', methods=['POST'])
def login():
    """Unified faculty login"""
    logger = logging.getLogger(__name__)
    role = request.args.get('role', 'teacher')

    try:
        collections = get_collections()
    except Exception as e:
        logger.error(f"Database connection error during faculty login: {str(e)}")
        flash(f"Database connection error: {str(e)}. Please check MongoDB connection.", "error")
        return redirect('/multilogin')
    
    if request.is_json:
        payload = request.get_json(silent=True) or {}
        email = str(payload.get('faculty_email') or payload.get('email') or '').strip().lower()
        password = payload.get('password', '')
    else:
        email = request.form.get('faculty_email', '').strip().lower()
        password = request.form.get('password', '')

    if not email or not password:
        logger.warning(f"Faculty login attempt with missing credentials from IP: {request.remote_addr}")
        if wants_json_response():
            return jsonify({'success': False, 'errors': ['Please enter both email and password.']}), 400
        flash("Please enter both email and password.", "error")
        return redirect('/multilogin')

    logger.info(f"Faculty login attempt: {email} from IP: {request.remote_addr}")

    try:
        # 🔧 Changed from 'users' → 'faculty'
        user = collections['faculty'].find_one({"email": email})
        if not user:
            logger.warning(f"Faculty login failed: User {email} not found in database")
            if wants_json_response():
                return jsonify({'success': False, 'errors': ['Invalid email or password.']}), 401
            flash("Invalid email or password.", "error")
            return redirect('/multilogin')

        hashed_password = user.get('password')
        if not bcrypt.checkpw(password.encode('utf-8'), hashed_password):
            logger.warning(f"Faculty login failed: Invalid password for {email}")
            if wants_json_response():
                return jsonify({'success': False, 'errors': ['Invalid email or password.']}), 401
            flash("Invalid email or password.", "error")
            return redirect('/multilogin')

        session['faculty_email'] = email
        session['role'] = user.get('role', role)
        session['faculty_name'] = user.get('name', 'Faculty')

        logger.info(f"✓ Faculty successfully logged in: {email} (Role: {session['role']}) from IP: {request.remote_addr}")
        if wants_json_response():
            return jsonify(
                build_auth_response(
                    user={
                        'email': email,
                        'name': session.get('faculty_name', 'Faculty'),
                        'role': session.get('role', role),
                    },
                    role=session.get('role', role),
                    redirect_path='/admin/dashboard' if session.get('role') == 'super_admin' else '/faculty/dashboard',
                )
            )
        return redirect('/dashboard')
    except Exception as e:
        logger.error(f"Faculty login error for {email}: {str(e)}")
        if wants_json_response():
            return jsonify({'success': False, 'errors': [f'Login error: {str(e)}']}), 500
        flash(f"Login error: {str(e)}", "error")
        return redirect('/multilogin')


@bp.route('/logout')
def logout():
    """Logout faculty"""
    logger = logging.getLogger(__name__)
    email = session.get('faculty_email', 'Unknown')
    logger.info(f"Faculty logged out: {email}")
    session.clear()
    if wants_json_response():
        return jsonify({'success': True, 'message': 'Logged out'})
    return redirect('/multilogin')


# --------------------------------------------------------------------
# PROFILE PAGE
# --------------------------------------------------------------------
@bp.route('/profile')
def profile():
    """Faculty profile page"""
    faculty_email = session.get('faculty_email')
    if not faculty_email:
        return redirect('/multilogin')

    collections = get_collections()
    
    # Use the 'faculty' collection, not 'users'
    user = collections['faculty'].find_one({'email': faculty_email})
    if not user:
        flash("Faculty not found.", "error")
        return redirect('/multilogin')

    faculty_name = user.get('name', 'Faculty')
    role = user.get('role', 'Faculty')
    department = user.get('department', 'N/A')
    faculty_id = user.get('faculty_id', 'N/A')
    phone = user.get('phone', 'N/A')
    joined_date = user.get('joined_date', 'N/A')
    qualification = user.get('qualification', 'N/A')
    address = user.get('address', 'N/A')
    
    raw_photo_path = user.get('photo_path', 'img/faculty.jpg')
    if raw_photo_path.startswith('http') or raw_photo_path.startswith('https'):
        photo_path = raw_photo_path
    else:
        photo_path = url_for('static', filename=raw_photo_path)

    return render_template(
        'faculty/faculty_profile.html',
        faculty_name=faculty_name,
        faculty_email=faculty_email,
        role=role,
        department=department,
        faculty_id=faculty_id,
        phone=phone,
        joined_date=joined_date,
        qualification=qualification,
        address=address,
        photo_path=photo_path
    )


@bp.route('/profile/photo', methods=['POST'])
@bp.route('/faculty/profile/photo', methods=['POST'])
def upload_profile_photo():
    """Allow faculty to upload/update their profile photo."""
    expects_json = wants_json_response()

    def _fail(message, status=400):
        if expects_json:
            return jsonify({'success': False, 'message': message}), status
        flash(message, 'error')
        return redirect(url_for('faculty.profile'))

    def _ok(message):
        if expects_json:
            return jsonify({'success': True, 'message': message}), 200
        flash(message, 'success')
        return redirect(url_for('faculty.profile'))

    faculty_email = session.get('faculty_email')
    if not faculty_email:
        if expects_json:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        return redirect('/multilogin')

    file = request.files.get('photo')
    if not file or file.filename == '':
        return _fail('Please choose an image to upload.')

    allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in allowed_ext:
        return _fail('Invalid file type. Please upload an image (png, jpg, jpeg, gif, webp).')

    if not (file.mimetype or '').startswith('image/'):
        return _fail('Only image uploads are allowed.')

    raw_bytes = file.read()
    max_bytes = 20 * 1024 * 1024  # 20 MB
    if len(raw_bytes) > max_bytes:
        return _fail('Image too large. Please upload a photo under 20MB.')
    
    # Check if Cloudinary is configured
    is_cloudinary_configured = (
        os.environ.get('CLOUDINARY_CLOUD_NAME') and
        os.environ.get('CLOUDINARY_API_KEY') and
        os.environ.get('CLOUDINARY_API_SECRET')
    )

    collections = get_collections()

    if is_cloudinary_configured:
        try:
            # Configure Cloudinary
            cloudinary.config(
                cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
                api_key=os.environ.get('CLOUDINARY_API_KEY'),
                api_secret=os.environ.get('CLOUDINARY_API_SECRET')
            )
            
            # Upload directory in Cloudinary
            folder = "facemarkpro/faculty_photos"
            public_id = secure_filename(faculty_email.replace('@', '_at_'))
            
            # Upload to Cloudinary
            response = cloudinary.uploader.upload(
                file=BytesIO(raw_bytes),
                folder=folder,
                public_id=public_id,
                overwrite=True,
                resource_type="image"
            )
            
            # Save the secure URL to DB
            secure_url = response.get('secure_url')
            if secure_url:
                collections['faculty'].update_one({'email': faculty_email}, {'$set': {'photo_path': secure_url}})
                return _ok('Profile photo successfully updated.')
            else:
                raise Exception("Cloudinary upload failed to return secure_url")
                
        except Exception as e:
            current_app.logger.error(f"Cloudinary upload failed: {e}")
            if not expects_json:
                flash('Cloud upload failed. Falling back to local storage.', 'error')
            # Fallback to local is below...

    # Fallback to local storage (or if Cloudinary not configured)
    try:
        image = Image.open(BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        return _fail('Invalid image file.')

    buffer = BytesIO()
    image.save(buffer, format='JPEG', quality=85, optimize=True)
    buffer.seek(0)

    safe_email = secure_filename(faculty_email.replace('@', '_at_'))
    stored_name = f"{safe_email}.jpg"
    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'faculty_photos')
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, stored_name)

    try:
        with open(save_path, 'wb') as f:
            f.write(buffer.read())
    except Exception as exc:  # pragma: no cover
        current_app.logger.exception("Failed to save profile photo: %s", exc)
        return _fail('Could not save the photo. Please try again.', status=500)

    relative_path = f"uploads/faculty_photos/{stored_name}"
    collections['faculty'].update_one({'email': faculty_email}, {'$set': {'photo_path': relative_path}})

    return _ok('Profile photo updated successfully (Local).')

# --------------------------------------------------------------------
# DASHBOARD PAGE (unchanged except collection fix)
# --------------------------------------------------------------------
@bp.route('/dashboard')
def dashboard():
    """Faculty dashboard with timetable and attendance stats"""
    import time
    logger = logging.getLogger(__name__)
    start_time = time.time()
    faculty_email = session.get('faculty_email')
    
    if not faculty_email:
        logger.warning(f"Dashboard access denied: No faculty_email in session. Session data: {dict(session)}")
        logger.debug(f"Session cookies: {request.cookies}")
        return redirect('/multilogin')
    
    logger.info(f"Dashboard accessed by: {faculty_email}")
    collections = get_collections()
    
    # Cache faculty lookup - single query instead of later
    faculty_doc = collections['faculty'].find_one(
        {'email': faculty_email},
        {'name': 1, 'email': 1}  # Project only needed fields
    )
    if not faculty_doc:
        logger.warning(f"Dashboard: Faculty {faculty_email} not found in database")
        session.clear()
        flash("Faculty not found.", "error")
        return redirect('/multilogin')

    faculty_name = str(faculty_doc.get('name', 'Faculty')).strip().lower()

    def parse_time_safe(value):
        try:
            return datetime.strptime(str(value), "%H:%M").time()
        except Exception:
            return datetime.min.time()

    def compute_status(doc):
        start = parse_time_safe(doc.get('start_time', ''))
        end = parse_time_safe(doc.get('end_time', ''))
        now = datetime.now().time()
        if start <= now <= end:
            return 'current'
        if now < start:
            return 'upcoming'
        return 'past'

    # Prefer faculty_email; fallback to name (lowercased) for legacy rows
    # OPTIMIZED: Use projection to fetch only needed fields
    raw_lectures = list(collections['timetable'].find(
        {"faculty_email": faculty_email},
        {
            "_id": 0,
            "day": 1, "period_no": 1, "start_time": 1, "end_time": 1,
            "subject": 1, "classroom": 1, "semester": 1, "branch": 1,
            "section": 1, "faculty_email": 1, "faculty_name": 1
        }
    ))

    lectures = []
    for doc in raw_lectures:
        lectures.append({
            "day": doc.get("day", ""),
            "period_no": int(doc.get("period_no", 0) or 0),
            "start_time": str(doc.get("start_time", "")),
            "end_time": str(doc.get("end_time", "")),
            "subject": doc.get("subject", ""),
            "classroom": doc.get("classroom", ""),
            "semester": int(doc.get("semester", 0) or 0),
            "branch": doc.get("branch", ""),
            "section": doc.get("section", ""),
            "faculty_email": doc.get("faculty_email", faculty_email),
            "faculty_name": doc.get("faculty_name", faculty_name),
        })

    for lec in lectures:
        lec['status'] = compute_status(lec)

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    time_slots = sorted({lec.get('start_time') for lec in lectures if lec.get('start_time')}, key=parse_time_safe)
    timetable = {(lec.get('day'), lec.get('start_time')): {'subject': lec.get('subject'), 'classroom': lec.get('classroom')} for lec in lectures}

    today_str = datetime.now().strftime('%Y-%m-%d')
    
    # OPTIMIZED: Use aggregation pipeline for today's attendance stats
    class_attendance = defaultdict(int)
    attendance_pipeline = [
        {"$match": {
            "date": today_str,
            "faculty_email": faculty_email,
            "student.status": "Present"
        }},
        {"$group": {
            "_id": {"branch": "$branch", "semester": "$semester", "section": "$section"},
            "count": {"$sum": 1}
        }}
    ]
    for doc in collections['attendance'].aggregate(attendance_pipeline):
        key = f"{doc['_id']['branch']}-{doc['_id']['semester']}-{doc['_id']['section']}"
        class_attendance[key] = doc['count']

    today = datetime.now()
    thirty_days_ago = today - timedelta(days=30)
    monthly_trend = defaultdict(int)
    
    # OPTIMIZED: Filter by date in MongoDB instead of loading all records
    date_filter = {
        "faculty_email": faculty_email,
        "date": {
            "$gte": thirty_days_ago.strftime("%Y-%m-%d"),
            "$lte": today.strftime("%Y-%m-%d")
        },
        "student.status": "Present"
    }
    for doc in collections['attendance'].find(date_filter, {"date": 1, "student.status": 1}):
        try:
            monthly_trend[doc.get("date")] += 1
        except:
            continue
    monthly_labels = sorted(monthly_trend.keys())
    monthly_data = [monthly_trend[date] for date in monthly_labels]

    matrix = defaultdict(lambda: defaultdict(int))
    # OPTIMIZED: Filter by status in MongoDB, only get needed fields
    matrix_filter = {
        "faculty_email": faculty_email,
        "student.status": "Present"
    }
    for doc in collections['attendance'].find(matrix_filter, {"subject": 1, "classroom": 1}):
        subject = doc.get("subject", "?")
        classroom = doc.get("classroom", "?")
        matrix[subject][classroom] += 1

    bar_labels = sorted(matrix.keys())
    classroom_list = sorted(set(cls for subj in matrix.values() for cls in subj))
    bar_data = {cls: [matrix[subj].get(cls, 0) for subj in bar_labels] for cls in classroom_list}

    subject_labels = bar_labels
    classroom_labels = classroom_list
    heatmap_data = [
        {"x": j, "y": i, "v": matrix[subj].get(cls, 0)}
        for i, subj in enumerate(subject_labels)
        for j, cls in enumerate(classroom_labels)
    ]

    # --- Today's lecture logic ---
    now = datetime.now().time()
    today = datetime.now().strftime('%A')
    today_lectures = [lec for lec in lectures if lec.get('day') == today]

    today_lectures_sorted = sorted(today_lectures, key=lambda x: parse_time_safe(x['start_time']))
    current_lecture, next_lecture, upcoming_lectures = None, None, []
    for lec in today_lectures_sorted:
        start = parse_time_safe(lec['start_time'])
        end = parse_time_safe(lec['end_time'])
        if start <= now <= end:
            current_lecture = lec
        elif now < start:
            if not next_lecture:
                next_lecture = lec
            else:
                upcoming_lectures.append(lec)

    # OPTIMIZED: Single aggregation query for both stats instead of 2 count_documents
    attendance_stats = {'Present': 0, 'Absent': 0}
    stats_pipeline = [
        {"$match": {
            "date": today_str,
            "faculty_email": faculty_email
        }},
        {"$group": {
            "_id": "$student.status",
            "count": {"$sum": 1}
        }}
    ]
    for doc in collections['attendance'].aggregate(stats_pipeline):
        status = doc['_id']
        if status in attendance_stats:
            attendance_stats[status] = doc['count']

    # OPTIMIZED: Batch students query instead of multiple queries
    students_list = []
    seen_classes = set()
    class_filters = []
    for lec in lectures:
        key = (lec.get('branch'), lec.get('semester'), lec.get('section'))
        if key not in seen_classes:
            seen_classes.add(key)
            class_filters.append({
                "branch": lec.get('branch'),
                "semester": int(lec.get('semester', 0) or 0),
                "section": lec.get('section')
            })
    
    if class_filters:
        # Single query for all classes with projections
        students_cursor = collections['students'].find(
            {"$or": class_filters},
            {"roll_no": 1, "name": 1, "branch": 1, "semester": 1, "section": 1}
        )
        for s in students_cursor:
            students_list.append({
                "roll_no": str(s.get("roll_no", "")),
                "name": str(s.get("name", "")),
                "branch": str(s.get('branch', '')), 
                "semester": int(s.get('semester', 0) or 0),
                "section": str(s.get('section', ''))
            })

    # Log performance
    elapsed = time.time() - start_time
    logger.info(f"✓ Dashboard loaded for {faculty_email} in {elapsed:.2f}s")
    
    return render_template(
        'faculty/dashboard.html',
        faculty=faculty_name,
        lectures=lectures,
        days=days,
        time_slots=time_slots,
        timetable=timetable,
        class_attendance=class_attendance,
        monthly_labels=monthly_labels,
        monthly_data=monthly_data,
        bar_labels=bar_labels,
        classroom_list=classroom_list,
        bar_data=bar_data,
        heatmap_data=heatmap_data,
        subject_labels=subject_labels,
        classroom_labels=classroom_labels,
        current_lecture=current_lecture,
        next_lecture=next_lecture,
        upcoming_lectures=upcoming_lectures,
        attendance_stats=attendance_stats,
        students_list=students_list,
        is_admin=session.get('role') == 'super_admin'
    )


# --------------------------------------------------------------------
# REPORTS
# --------------------------------------------------------------------
@bp.route('/reports')
def reports():
    """Attendance reports for a faculty member (their subjects only)."""
    faculty_email = session.get('faculty_email')
    if not faculty_email:
        return redirect('/multilogin')

    collections = get_collections()
    faculty_doc = collections['faculty'].find_one({'email': faculty_email})
    if not faculty_doc:
        session.clear()
        flash("Faculty not found.", "error")
        return redirect('/multilogin')

    faculty_name_lower = str(faculty_doc.get('name', '')).strip().lower()
    subject_options, class_options = _get_faculty_filter_options(collections, faculty_email, faculty_name_lower)

    today_str = datetime.now().strftime('%Y-%m-%d')
    start_date, end_date = normalize_date_range(
        request.args.get('start_date'), request.args.get('end_date'), today_str
    )

    subject = request.args.get('subject') or None
    branch = request.args.get('branch') or None
    semester = request.args.get('semester') or None
    section = request.args.get('section') or None
    student_roll = request.args.get('student_roll') or None
    export_format = request.args.get('export')

    summary_rows, detail_rows, totals = build_attendance_report(
        collections,
        start_date=start_date,
        end_date=end_date,
        faculty_email=faculty_email,
        subject=subject,
        branch=branch,
        semester=semester,
        section=section,
        student_roll=student_roll,
    )

    if export_format == 'csv':
        csv_bytes, filename = export_csv_report(
            summary_rows,
            detail_rows,
            start_date,
            end_date,
            filename_prefix='attendance_report',
        )
        response = make_response(csv_bytes)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response

    if export_format == 'pdf':
        pdf_bytes, filename = export_pdf_report(
            summary_rows,
            detail_rows,
            start_date,
            end_date,
            filename_prefix='attendance_report',
        )
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response

    branch_options = sorted({c.get('branch') for c in class_options if c.get('branch')})
    semester_options = sorted({c.get('semester') for c in class_options if c.get('semester') is not None})
    section_options = sorted({c.get('section') for c in class_options if c.get('section')})

    return render_template(
        'faculty/reports.html',
        start_date=start_date,
        end_date=end_date,
        subject_options=subject_options,
        class_options=class_options,
        branch_options=branch_options,
        semester_options=semester_options,
        section_options=section_options,
        selected_subject=subject or '',
        selected_branch=branch or '',
        selected_semester=str(semester) if semester else '',
        selected_section=section or '',
        student_roll=student_roll or '',
        summary_rows=summary_rows,
        detail_rows=detail_rows,
        totals=totals,
        is_admin=session.get('role') == 'super_admin'
    )


# --------------------------------------------------------------------
# CHANGE PASSWORD
# --------------------------------------------------------------------
@bp.route('/change-password', methods=['GET', 'POST'])
def change_password():
    """Change faculty password"""
    collections = get_collections()

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        current_password = request.form.get('current_password', '')
        new_password = request.form.get('new_password', '')

        # 🔧 Changed from 'users' → 'faculty'
        user = collections['faculty'].find_one({"email": email})
        if not user or not bcrypt.checkpw(current_password.encode('utf-8'), user['password']):
            flash("Current password incorrect.", "error")
            return redirect('/profile')

        new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        collections['faculty'].update_one({"email": email}, {"$set": {"password": new_hashed}})

        session.clear()
        flash("Password changed successfully. Please log in again.", "success")
        return redirect('/login')

    return render_template("faculty/faculty_profile.html")


@bp.route('/save_layout', methods=['POST'])
def save_layout():
    """Save faculty dashboard layout to MongoDB"""
    if 'faculty_email' not in session:
        return {'error': 'Not authenticated'}, 401
    
    try:
        data = request.get_json()
        layout = data.get('layout', [])
        device_type = data.get('device_type', 'desktop')  # Default to desktop
        
        collections = get_collections()
        faculty_email = session['faculty_email']
        
        # Save layout for this faculty and device type
        collections['faculty_layouts'].update_one(
            {'faculty_email': faculty_email, 'device_type': device_type},
            {'$set': {'layout': layout, 'updated_at': datetime.utcnow()}},
            upsert=True
        )
        
        return {'success': True}, 200
    except Exception as e:
        current_app.logger.error(f"Error saving layout: {e}")
        return {'error': 'Failed to save layout'}, 500


@bp.route('/load_layout', methods=['GET'])
def load_layout():
    """Load faculty dashboard layout from MongoDB"""
    if 'faculty_email' not in session:
        return {'layout': []}, 200  # Return empty layout if not authenticated
    
    try:
        device_type = request.args.get('device_type', 'desktop')  # Default to desktop
        collections = get_collections()
        faculty_email = session['faculty_email']
        
        layout_doc = collections['faculty_layouts'].find_one({
            'faculty_email': faculty_email, 
            'device_type': device_type
        })
        
        if layout_doc and 'layout' in layout_doc:
            return {'layout': layout_doc['layout']}, 200
        else:
            return {'layout': []}, 200  # Return empty layout if none saved
    except Exception as e:
        current_app.logger.error(f"Error loading layout: {e}")
        return {'layout': []}, 200

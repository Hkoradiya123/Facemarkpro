from functools import wraps

from flask import jsonify, request, session


def wants_json_response():
    """Return True when the caller expects JSON instead of HTML."""
    if request.path.startswith('/api/'):
        return True

    accept = (request.headers.get('Accept') or '').lower()
    if 'application/json' in accept:
        return True

    xrw = (request.headers.get('X-Requested-With') or '').lower()
    return xrw == 'xmlhttprequest'


def json_ok(data=None, message=None, status=200):
    payload = {'success': True}
    if message:
        payload['message'] = message
    if data is not None:
        payload['data'] = data
    return jsonify(payload), status


def json_error(message, status=400, errors=None):
    payload = {
        'success': False,
        'message': message,
        'errors': errors or [message],
    }
    return jsonify(payload), status


def build_auth_response(user, role, redirect_path):
    return {
        'success': True,
        'user': user,
        'role': role,
        'redirectPath': redirect_path,
        'errors': [],
    }


def current_session_user():
    if session.get('student_roll_no'):
        return {
            'authenticated': True,
            'role': 'student',
            'user': {
                'roll_no': session.get('student_roll_no'),
                'name': session.get('student_name', 'Student'),
            },
        }

    if session.get('faculty_email'):
        return {
            'authenticated': True,
            'role': session.get('role', 'teacher'),
            'user': {
                'email': session.get('faculty_email'),
                'name': session.get('faculty_name', 'Faculty'),
            },
        }

    return {
        'authenticated': False,
        'role': None,
        'user': None,
    }


def require_session_role(roles=None):
    """API middleware to require an authenticated session and optional role list."""
    roles = set(roles or [])

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            session_user = current_session_user()
            if not session_user['authenticated']:
                return json_error('Unauthenticated', status=401)

            if roles and session_user['role'] not in roles:
                return json_error('Forbidden', status=403)

            return fn(*args, **kwargs)

        return wrapper

    return decorator

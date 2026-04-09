from flask import Flask, abort, redirect, request, send_from_directory, url_for
from flask_cors import CORS
from flask_session import Session
import os
from dotenv import load_dotenv
from .db.mongo_client import init_mongo_client

import logging
import sys

# Load environment variables from .env file
load_dotenv()

# Configure logging to stdout (essential for Hugging Face Spaces logs)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend development
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])
    
    # Configuration from environment variables with Hugging Face Spaces compatibility
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24).hex())
    
    # Anchor writable app data to the backend directory in local development,
    # regardless of the current working directory used to start Flask.
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    # For Hugging Face Spaces, continue using /tmp for writable directories.
    base_dir = os.environ.get('BASE_DIR', '/tmp') if os.environ.get('SPACE_ID') else backend_root
    
    app.config['UPLOAD_FOLDER'] = os.path.join(base_dir, os.environ.get('UPLOAD_FOLDER', 'dataset'))
    app.config['ENCODING_FILE'] = os.path.join(base_dir, os.environ.get('ENCODING_FILE', 'encodings/face_encodings.pickle'))
    app.config['TIMETABLE_FILE'] = os.path.join(base_dir, os.environ.get('TIMETABLE_FILE', 'timetable.csv'))
    app.config['ATTENDANCE_DIR'] = os.path.join(base_dir, os.environ.get('ATTENDANCE_DIR', 'attendance_logs'))
    app.config['SPLIT_DIR'] = os.path.join(base_dir, os.environ.get('SPLIT_DIR', 'split_encodings'))
    
    # Session configuration for Hugging Face Spaces
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = os.path.join(base_dir, 'flask_session')
    app.config['SESSION_PERMANENT'] = False
    
    # Cookie settings - only use SECURE and SAMESITE=None in production (HTTPS)
    # In development/local, use standard secure cookie settings
    is_production = os.environ.get('SPACE_ID') is not None
    
    if is_production:
        # For Hugging Face Spaces (HTTPS required)
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'
        app.config['SESSION_COOKIE_SECURE'] = True
    else:
        # For local development over HTTP, browsers reject SameSite=None cookies unless Secure is set.
        # Lax keeps the session usable across localhost ports without triggering cookie rejection.
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['SESSION_COOKIE_SECURE'] = False
        app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # Create necessary directories
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(os.path.dirname(app.config['ENCODING_FILE']), exist_ok=True)
        os.makedirs(app.config['SPLIT_DIR'], exist_ok=True)
        os.makedirs(app.config['ATTENDANCE_DIR'], exist_ok=True)
        os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)
    except Exception as e:
        print(f"Warning: Could not create directories: {e}")
    
    # Initialize session
    Session(app)
    
    # Initialize MongoDB
    try:
        init_mongo_client(app)
    except Exception as e:
        print(f"Warning: MongoDB initialization failed: {e}")
        print("The app will continue but database features may not work")
    
    # Register blueprints
    from .routes import student_routes, faculty_routes, attendance_routes, mobile_api, api_routes
    
    app.register_blueprint(student_routes.bp)
    app.register_blueprint(faculty_routes.bp)
    app.register_blueprint(attendance_routes.bp)
    app.register_blueprint(mobile_api.bp)
    app.register_blueprint(api_routes.bp)
    
    from .routes import admin_routes
    app.register_blueprint(admin_routes.bp)
    
    react_dist = os.environ.get(
        'REACT_DIST_DIR',
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist')),
    )

    react_route_prefixes = (
        '/',
        '/login',
        '/multilogin',
        '/admin',
        '/faculty',
        '/student',
    )

    def _serve_react_index():
        index_path = os.path.join(react_dist, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(react_dist, 'index.html')
        return redirect(url_for('faculty.home'))

    @app.before_request
    def serve_react_for_frontend_routes():
        if request.method not in ('GET', 'HEAD'):
            return None

        path = request.path.rstrip('/') or '/'
        protected_prefixes = ('/api', '/attendance', '/health', '/static', '/assets')
        if any(path == prefix or path.startswith(f'{prefix}/') for prefix in protected_prefixes):
            return None

        if path == '/' or any(path == prefix or path.startswith(f'{prefix}/') for prefix in react_route_prefixes[1:]):
            return _serve_react_index()

        return None

    # Root route
    @app.route('/')
    def root():
        return _serve_react_index()

    @app.route('/assets/<path:filename>')
    def react_assets(filename):
        assets_dir = os.path.join(react_dist, 'assets')
        return send_from_directory(assets_dir, filename)

    @app.route('/<path:path>')
    def spa_catch_all(path):
        protected_prefixes = ('api', 'attendance', 'admin', 'student', 'health', 'static', 'assets')
        if any(path == prefix or path.startswith(f'{prefix}/') for prefix in protected_prefixes):
            abort(404)

        if not os.path.exists(os.path.join(react_dist, 'index.html')):
            return redirect(url_for('faculty.home'))

        candidate = os.path.join(react_dist, path)
        if os.path.exists(candidate) and os.path.isfile(candidate):
            return send_from_directory(react_dist, path)

        return send_from_directory(react_dist, 'index.html')
    
    # Health check endpoint for Hugging Face Spaces
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'service': 'FaceMarkPro'}, 200
    
    return app
 

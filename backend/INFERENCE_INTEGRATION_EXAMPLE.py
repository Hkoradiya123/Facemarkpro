"""
Example: Modified attendance route to use remote inference service
This shows how to adapt your current code to optionally use HF Spaces inference.

Replace this in app/routes/attendance_routes.py in the process_attendance_frame() function
"""

from flask import Blueprint, request, jsonify, session
from ..utils.inference_client import get_inference_client
from ..services.face_recognition import FaceRecognitionService
from ..db.mongo_client import get_collections
import numpy as np
import base64
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# In your attendance routes:

@bp.route('/process_frame_hybrid', methods=['POST'])
def process_attendance_frame_hybrid():
    """
    Process a frame in live attendance session
    Uses remote inference service if available, falls back to local
    """
    faculty_email = session.get('faculty_email')
    if not faculty_email:
        return jsonify({'error': 'Not logged in'}), 401
    
    session_id = request.form.get('session_id')
    img_data = request.form.get('frame')
    
    if not session_id or not img_data:
        return jsonify({'error': 'Missing session_id or frame data'}), 400
    
    try:
        # Get inference client (may be None if remote not available)
        inference_client = get_inference_client()
        
        # Load encodings
        data = get_pickle_from_cloudinary(class_id)
        if not data:
            return jsonify({'error': 'Encoding data not found'}), 404
        
        known_encodings = np.array(data['encodings'])
        known_metadata = data.get('metadata', [])
        
        if inference_client:
            # === REMOTE INFERENCE ===
            logger.info(f"Using REMOTE inference service for session {session_id}")
            
            recognized_students = inference_client.recognize_frame(
                img_data,
                known_encodings,
                known_metadata,
                tolerance=0.85
            )
            
            if recognized_students is None:
                logger.warning("Remote inference failed, falling back to local")
                # Fall through to local inference below
                inference_client = None
            else:
                # Success with remote
                recognized_in_frame = set()
                for student in recognized_students:
                    roll_no = student.get('roll_no', '')
                    name = student.get('name', '')
                    student_id = f"{roll_no}_{name}" if roll_no else name
                    recognized_in_frame.add(student_id)
                    logger.info(f"✓ Remote recognized: {name} ({roll_no})")
                
                # Update session and return
                with session_lock:
                    if session_id in live_attendance_sessions:
                        live_attendance_sessions[session_id]['recognized_students'].update(recognized_in_frame)
                
                return jsonify({
                    'success': True,
                    'recognized_in_frame': list(recognized_in_frame),
                    'total_recognized': len(live_attendance_sessions[session_id]['recognized_students']),
                    'inference_mode': 'remote'
                })
        
        # === LOCAL INFERENCE (fallback or if remote not configured) ===
        if not inference_client:
            logger.info(f"Using LOCAL inference for session {session_id}")
            
            face_service = FaceRecognitionService()
            
            # Decode frame
            img_bytes = base64.b64decode(img_data.split(',')[1])
            img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            frame = np.array(img)
            
            # Get faces
            faces = face_service.get_faces(frame)
            
            recognized_in_frame = set()
            tolerance = 0.85
            
            for face in faces:
                embedding = face.normed_embedding
                dists = np.linalg.norm(known_encodings - embedding, axis=1)
                min_dist = np.min(dists)
                min_idx = np.argmin(dists)
                
                if min_dist < tolerance:
                    student_info = known_metadata[min_idx]
                    roll_no = student_info.get('roll_no', '')
                    name = student_info.get('name', '')
                    student_id = f"{roll_no}_{name}" if roll_no else name
                    recognized_in_frame.add(student_id)
                    logger.info(f"✓ Local recognized: {name} ({roll_no})")
            
            # Update session
            with session_lock:
                if session_id in live_attendance_sessions:
                    live_attendance_sessions[session_id]['recognized_students'].update(recognized_in_frame)
            
            return jsonify({
                'success': True,
                'recognized_in_frame': list(recognized_in_frame),
                'total_recognized': len(live_attendance_sessions[session_id]['recognized_students']),
                'inference_mode': 'local'
            })
    
    except Exception as e:
        logger.error(f"Frame processing error: {e}")
        return jsonify({'error': f'Processing error: {str(e)}'}), 500


"""
CONFIGURATION:
==============

In your .env file or deployment config, add:

# For using HF Spaces remote inference
INFERENCE_SERVICE_URL=https://your-username-face-inference-service.hf.space

# Or leave it unset to use only local inference
# INFERENCE_SERVICE_URL=

The app will:
1. If INFERENCE_SERVICE_URL is set and service is healthy → use remote
2. If INFERENCE_SERVICE_URL is set but service is down → fall back to local
3. If INFERENCE_SERVICE_URL is not set → use local only

No database changes needed. Attendance table and structure remain the same.
"""

from insightface.app import FaceAnalysis
import numpy as np
import cv2
import os
import base64
import logging
from typing import Optional, List, Dict, Tuple

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """Service for face detection and recognition using InsightFace (local or remote)"""
    _shared_face_app = None
    
    def __init__(self):
        """Initialize the face recognition service"""
        self.face_app = self.__class__._shared_face_app
        self.inference_client = None
        self.mode = os.environ.get('FACE_RECOGNITION_MODE', 'hybrid').lower()  # hybrid, local, remote
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize based on configured mode"""
        if self.mode not in ['local', 'remote', 'hybrid']:
            logger.warning(f"Invalid mode '{self.mode}', defaulting to 'hybrid'")
            self.mode = 'hybrid'
        
        logger.info(f"✓ Face Recognition Mode: {self.mode.upper()}")
        
        # Local mode: only use local
        if self.mode == 'local':
            logger.info("ℹ FORCED LOCAL mode - will not use remote service")
            self._initialize_face_app()
            return
        
        # Remote or Hybrid: try to get remote client
        try:
            from app.utils.inference_client import get_inference_client
            self.inference_client = get_inference_client()
            
            if self.inference_client:
                logger.info("✓ Remote inference service connected")
                if self.mode == 'remote':
                    logger.info("ℹ FORCED REMOTE mode - will NOT load local models")
                    return  # Do NOT initialize face_app in remote mode
            else:
                logger.warning("✗ Remote inference service not available")
                if self.mode == 'remote':
                    logger.error("ERROR: Remote mode requested but service unavailable!")
                    raise RuntimeError("Remote service unavailable and mode set to 'remote'")
                else:
                    logger.info("ℹ Falling back to LOCAL (hybrid mode)")
                    self._initialize_face_app()
        except ImportError as e:
            logger.warning(f"Inference client not found: {e}")
            if self.mode == 'remote':
                raise RuntimeError("Remote mode requested but client unavailable")
            self._initialize_face_app()
    
    def _initialize_face_app(self):
        """Initialize the InsightFace application"""
        try:
            if self.__class__._shared_face_app is not None:
                self.face_app = self.__class__._shared_face_app
                return

            # Get model name from environment variable
            model_name = os.environ.get('FACE_RECOGNITION_MODEL', "buffalo_l")
            face_app = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
            face_app.prepare(ctx_id=0)
            self.__class__._shared_face_app = face_app
            self.face_app = face_app
        except Exception as e:
            print(f"Error initializing face recognition: {e}")
            raise
    
    def get_faces(self, image):
        """
        Detect faces in an image and return face embeddings
        LOCAL MODE ONLY - Do not use in remote mode
        
        Args:
            image: RGB numpy array of the image
            
        Returns:
            List of detected faces with embeddings
        """
        if self.mode == 'remote':
            logger.error("get_faces() called in REMOTE mode - not supported!")
            return []
        
        if self.face_app is None:
            self._initialize_face_app()
        
        try:
            faces = self.face_app.get(image)
            return faces
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []
    
    def get_face_embedding(self, image):
        """
        Get face embedding from an image (uses remote service if available and configured)
        
        Args:
            image: RGB numpy array of the image
            
        Returns:
            Face embedding as numpy array or None if no face detected
        """
        # Remote mode: ONLY use remote
        if self.mode == 'remote':
            if not self.inference_client:
                logger.error("Remote mode but client not available")
                return None
            try:
                import io
                from PIL import Image as PILImage
                
                img_pil = PILImage.fromarray(image)
                buffered = io.BytesIO()
                img_pil.save(buffered, format="JPEG", quality=95)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                img_data = f"data:image/jpeg;base64,{img_base64}"
                
                embedding = self.inference_client.get_embedding(img_data)
                if embedding is not None and len(embedding) > 0:
                    logger.info("✓ Got embedding from REMOTE service")
                    return np.array(embedding)
                else:
                    logger.warning("Remote embedding failed")
                    return None
            except Exception as e:
                logger.error(f"Remote embedding error: {e}")
                return None
        
        # Hybrid or Local: try remote first (if available), then local
        if self.mode == 'hybrid' and self.inference_client:
            try:
                import io
                from PIL import Image as PILImage
                
                img_pil = PILImage.fromarray(image)
                buffered = io.BytesIO()
                img_pil.save(buffered, format="JPEG", quality=95)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                img_data = f"data:image/jpeg;base64,{img_base64}"
                
                embedding = self.inference_client.get_embedding(img_data)
                if embedding is not None and len(embedding) > 0:
                    logger.info("✓ Got embedding from REMOTE service")
                    return np.array(embedding)
                else:
                    logger.warning("Remote embedding failed, falling back to local")
            except Exception as e:
                logger.error(f"Remote embedding error: {e}, falling back to local")
        
        # Fall back to local processing (for hybrid or local mode)
        faces = self.get_faces(image)
        if faces:
            logger.info("✓ Got embedding from LOCAL service")
            return faces[0].normed_embedding
        return None
    
    def compare_faces(self, known_encodings, face_encoding, tolerance=None):
        """
        Compare a face encoding with known encodings
        
        Args:
            known_encodings: List of known face encodings
            face_encoding: Face encoding to compare
            tolerance: Distance threshold for matching (uses env var if None)
            
        Returns:
            List of boolean values indicating matches
        """
        if face_encoding is None:
            return []

        known_encodings = np.asarray(known_encodings)
        if known_encodings.size == 0:
            return []
        
        # Get tolerance from environment variable if not provided
        if tolerance is None:
            tolerance = float(os.environ.get('FACE_RECOGNITION_TOLERANCE', 0.85))
        
        distances = np.linalg.norm(known_encodings - face_encoding, axis=1)
        return distances < tolerance
    
    def find_matching_face(self, known_encodings, known_metadata, face_encoding, tolerance=None):
        """
        Find the best matching face from known encodings
        
        Args:
            known_encodings: List of known face encodings
            known_metadata: List of metadata corresponding to known encodings
            face_encoding: Face encoding to match
            tolerance: Distance threshold for matching (uses env var if None)
            
        Returns:
            Tuple of (matched_metadata, distance) or (None, None) if no match
        """
        if face_encoding is None:
            return None, None

        known_encodings = np.asarray(known_encodings)
        if known_encodings.size == 0:
            return None, None
        
        # Get tolerance from environment variable if not provided
        if tolerance is None:
            tolerance = float(os.environ.get('FACE_RECOGNITION_TOLERANCE', 0.85))
        
        distances = np.linalg.norm(known_encodings - face_encoding, axis=1)
        min_idx = np.argmin(distances)
        min_distance = distances[min_idx]
        
        if min_distance < tolerance:
            return known_metadata[min_idx], min_distance
        
        return None, None
    
    def recognize_faces_in_frame(
        self, 
        frame: np.ndarray, 
        known_encodings: List[np.ndarray], 
        known_metadata: List[Dict],
        tolerance: Optional[float] = None
    ) -> List[Dict]:
        """
        Recognize faces in a frame (uses remote service if configured)
        
        Args:
            frame: RGB numpy array of the image
            known_encodings: List of known face encodings
            known_metadata: List of metadata dicts (must have 'roll_no' and 'name')
            tolerance: Distance threshold for matching
            
        Returns:
            List of recognized students with their info
        """
        if tolerance is None:
            tolerance = float(os.environ.get('FACE_RECOGNITION_TOLERANCE', 0.85))
        
        # Remote mode: ONLY use remote
        if self.mode == 'remote':
            if not self.inference_client:
                logger.error("Remote mode but client not available")
                return []
            try:
                import io
                from PIL import Image as PILImage
                
                img_pil = PILImage.fromarray(frame)
                buffered = io.BytesIO()
                img_pil.save(buffered, format="JPEG", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                img_data = f"data:image/jpeg;base64,{img_base64}"
                
                recognized = self.inference_client.recognize_frame(
                    frame_data=img_data,
                    known_encodings=known_encodings,
                    known_metadata=known_metadata,
                    tolerance=tolerance
                )
                
                if recognized is not None:
                    logger.info(f"✓ Recognized {len(recognized)} faces via REMOTE service")
                    return recognized
                else:
                    logger.warning("Remote recognition failed")
                    return []
            except Exception as e:
                logger.error(f"Remote recognition error: {e}")
                return []
        
        # Hybrid or Local: try remote first (if available), then local
        if self.mode == 'hybrid' and self.inference_client:
            try:
                import io
                from PIL import Image as PILImage
                
                img_pil = PILImage.fromarray(frame)
                buffered = io.BytesIO()
                img_pil.save(buffered, format="JPEG", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                img_data = f"data:image/jpeg;base64,{img_base64}"
                
                recognized = self.inference_client.recognize_frame(
                    frame_data=img_data,
                    known_encodings=known_encodings,
                    known_metadata=known_metadata,
                    tolerance=tolerance
                )
                
                if recognized is not None:
                    logger.info(f"✓ Recognized {len(recognized)} faces via REMOTE service")
                    return recognized
                else:
                    logger.warning("Remote recognition failed, falling back to local")
            except Exception as e:
                logger.error(f"Remote recognition error: {e}, falling back to local")
        
        # Fall back to local processing (for hybrid or local mode)
        recognized = []
        faces = self.get_faces(frame)
        
        for face in faces:
            embedding = face.normed_embedding
            metadata, distance = self.find_matching_face(known_encodings, known_metadata, embedding, tolerance)
            
            if metadata:
                recognized.append({
                    'roll_no': metadata.get('roll_no', ''),
                    'name': metadata.get('name', ''),
                    'distance': float(distance)
                })
        
        logger.info(f"✓ Recognized {len(recognized)} faces via LOCAL service")
        return recognized 


_service_instance = None


def get_face_recognition_service():
    """Return a cached face recognition service instance for the current process."""
    global _service_instance
    if _service_instance is None:
        _service_instance = FaceRecognitionService()
    return _service_instance

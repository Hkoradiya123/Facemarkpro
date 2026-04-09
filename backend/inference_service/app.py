"""
Face Inference Microservice for Hugging Face Spaces
Extracts face embeddings and matches against known encodings
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import numpy as np
import io
import base64
from PIL import Image
import cv2
import logging
from insightface.app import FaceAnalysis
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global face recognition model (loaded once on startup)
face_app = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan (startup and shutdown)"""
    global face_app
    # Startup
    try:
        logger.info("Loading face recognition model...")
        model_name = os.environ.get('FACE_RECOGNITION_MODEL', "buffalo_l")
        face_app = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
        face_app.prepare(ctx_id=0)
        logger.info("✓ Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
    
    yield
    
    # Shutdown (cleanup if needed)
    logger.info("Shutting down...")

app = FastAPI(title="Face Inference Service", version="1.0", lifespan=lifespan)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    logger.info(f"✓ Static files mounted from {static_dir}")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the web UI"""
    html_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Face Inference Service</h1><p>API is running. Visit /docs for API documentation.</p>"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "face-inference"}

@app.post("/recognize")
async def recognize_face(
    frame_data: str = Form(...),
    known_encodings: str = Form(...),
    tolerance: float = Form(default=0.85)
):
    """
    Recognize faces in a frame against known encodings
    
    Args:
        frame_data: Base64 encoded image
        known_encodings: JSON string of numpy array (serialized)
        tolerance: Distance threshold for matching
    
    Returns:
        List of matched student IDs and distances
    """
    try:
        if not face_app:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Decode frame
        img_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        frame = np.array(img)
        
        # Detect faces
        faces = face_app.get(frame)
        
        if not faces:
            return {"success": True, "recognized": [], "count": 0}
        
        # Parse known encodings
        import json
        known_data = json.loads(known_encodings)
        known_encodings_arr = np.array(known_data['encodings'])
        known_metadata = known_data.get('metadata', [])
        
        recognized = []
        
        # Match each detected face
        for face in faces:
            embedding = face.normed_embedding
            distances = np.linalg.norm(known_encodings_arr - embedding, axis=1)
            min_idx = np.argmin(distances)
            min_distance = float(distances[min_idx])
            
            if min_distance < tolerance:
                student_info = known_metadata[min_idx]
                recognized.append({
                    "roll_no": student_info.get('roll_no', ''),
                    "name": student_info.get('name', ''),
                    "distance": min_distance
                })
                logger.info(f"✓ Recognized: {student_info.get('name')} - Distance: {min_distance:.3f}")
        
        return {
            "success": True,
            "recognized": recognized,
            "count": len(recognized),
            "faces_detected": len(faces)
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=400, detail="Invalid encoding data format")
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recognize_batch")
async def recognize_batch(
    frames: list = Form(...),
    known_encodings: str = Form(...),
    tolerance: float = Form(default=0.85)
):
    """
    Batch recognition for multiple frames
    """
    try:
        if not face_app:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        import json
        known_data = json.loads(known_encodings)
        known_encodings_arr = np.array(known_data['encodings'])
        known_metadata = known_data.get('metadata', [])
        
        all_recognized = set()
        
        for frame_data in frames:
            try:
                img_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
                img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
                frame = np.array(img)
                
                faces = face_app.get(frame)
                
                for face in faces:
                    embedding = face.normed_embedding
                    distances = np.linalg.norm(known_encodings_arr - embedding, axis=1)
                    min_idx = np.argmin(distances)
                    min_distance = float(distances[min_idx])
                    
                    if min_distance < tolerance:
                        student_info = known_metadata[min_idx]
                        all_recognized.add(student_info.get('roll_no', ''))
            except Exception as e:
                logger.warning(f"Error processing frame in batch: {e}")
                continue
        
        return {
            "success": True,
            "recognized": list(all_recognized),
            "count": len(all_recognized)
        }
        
    except Exception as e:
        logger.error(f"Batch recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_embedding")
async def get_embedding(
    image_data: str = Form(...)
):
    """
    Extract embedding from a single image
    """
    try:
        if not face_app:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        img_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        frame = np.array(img)
        
        faces = face_app.get(frame)
        
        if not faces:
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        embedding = faces[0].normed_embedding.tolist()
        
        return {
            "success": True,
            "embedding": embedding,
            "faces_detected": len(faces)
        }
        
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)

---
title: Face Inference Service
emoji: 👤
colorFrom: blue
colorTo: purple
sdk: docker
app_file: app.py
pinned: false
---

# Face Inference Service

A lightweight FastAPI service for face detection and recognition using InsightFace.

## Deployment on Hugging Face Spaces

### Option 1: Docker (Recommended)

1. Create a **new Space** on Hugging Face:
   - Go to https://huggingface.co/new-space
   - Name: `face-inference-service`
   - Space SDK: **Docker**
   - License: MIT

2. Upload files to the space:
   - `Dockerfile`
   - `requirements.txt`
   - `app.py`
   - `README.md` (this file)

3. Wait for auto-build (2-5 minutes). Space URL will be something like:
   ```
   https://your-username-face-inference-service.hf.space
   ```

### Option 2: Direct Python (if you prefer)

Create a `app.py` with the FastAPI code and add to a **Python** space type.

## API Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "service": "face-inference"
}
```

### Recognize Faces in Frame
```
POST /recognize
Content-Type: application/x-www-form-urlencoded

Parameters:
- frame_data: Base64-encoded JPEG image
- known_encodings: JSON string with {"encodings": [...], "metadata": [...]}
- tolerance: float (default 0.85)
```

Response:
```json
{
  "success": true,
  "recognized": [
    {
      "roll_no": "CS001",
      "name": "John Doe",
      "distance": 0.73
    }
  ],
  "count": 1,
  "faces_detected": 1
}
```

### Get Embedding from Image
```
POST /get_embedding
Content-Type: application/x-www-form-urlencoded

Parameters:
- image_data: Base64-encoded JPEG image
```

Response:
```json
{
  "success": true,
  "embedding": [0.1, 0.2, ...],
  "faces_detected": 1
}
```

## Usage in Main App

See `../app/utils/inference_client.py` for integration example.

## Performance Notes

- First request will be slow (~30-60s) if Space was idle.
- Paid HF Spaces tier keeps service always-on.
- Free tier may spin down after inactivity.

## Environment Variables

- `FACE_RECOGNITION_MODEL`: Model name (default: "buffalo_l")
- `PORT`: Service port (default: 7860)


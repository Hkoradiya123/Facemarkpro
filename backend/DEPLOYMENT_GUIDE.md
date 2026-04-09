# Deployment Guide: Face Inference on Hugging Face Spaces

## Step 1: Create Hugging Face Space

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Space name**: `face-inference-service` (or your preference)
   - **Space SDK**: Docker
   - **License**: MIT
3. Click **Create Space**

## Step 2: Upload Files

Once space is created, clone or upload these files to the space repo:
```
inference_service/
├── Dockerfile
├── requirements.txt
├── app.py
└── README.md
```

Either:
- Clone the space repo and push files via git
- Or use the HF web UI to upload files directly

## Step 3: Wait for Build

HuggingFace will auto-build the Docker image (~2-5 minutes). You'll see:
- Build logs in the Space page
- Green checkmark when ready
- Space URL like: `https://your-username-face-inference-service.hf.space`

## Step 4: Configure Main App

Update your main FaceMarkPro app with the remote service URL.

### Option A: Environment Variable (Recommended)
```bash
# In .env file or deployment config
INFERENCE_SERVICE_URL=https://your-username-face-inference-service.hf.space
```

### Option B: Fallback Logic (Automatic)
The app will:
1. Try to use remote service if `INFERENCE_SERVICE_URL` is set
2. Fall back to local InsightFace if remote is unavailable
3. No code changes needed; just set the env var

## Step 5: Update Attendance Routes (Optional)

If you want to use remote inference, modify `app/routes/attendance_routes.py`:

**Before** (current local inference):
```python
from ..services.face_recognition import FaceRecognitionService

face_service = FaceRecognitionService()
faces = face_service.get_faces(rgb_small_frame)
```

**After** (with remote option):
```python
from ..utils.inference_client import get_inference_client

inference_client = get_inference_client()

if inference_client:
    # Use remote service
    recognized = inference_client.recognize_frame(
        base64_frame,
        known_encodings,
        known_metadata,
        tolerance=0.85
    )
else:
    # Fallback to local
    from ..services.face_recognition import FaceRecognitionService
    face_service = FaceRecognitionService()
    faces = face_service.get_faces(rgb_small_frame)
```

## Cost Estimate (HF Spaces)

| Tier | Cost | Best For |
|------|------|----------|
| Free CPU | $0 | Demo/testing (idles after inactivity) |
| GPU-T4 (small) | ~$10/month | Small production use |
| GPU-A40 (large) | ~$40/month | High-traffic or batch processing |

For live attendance with students, **T4 GPU (~$10/month)** is recommended.

## Monitoring & Troubleshooting

### Check Service Status
```bash
curl https://your-username-face-inference-service.hf.space/health
```

### View Logs
- On HF Space page, click **View logs** tab
- See model loading, processing, and error messages

### If Service is Slow
1. Check if you're on free tier (cold start ~30-60s)
2. Consider upgrading to GPU tier for always-on
3. Pre-warm the model with test request after restart

### Network Issues
- HF Spaces are HTTPS by default (✓ secure)
- Some corporate networks may block external requests
- Fallback to local inference still works

## Local Testing (Before Pushing to HF)

```bash
# Build locally
docker build -t face-inference:latest ./inference_service

# Run locally
docker run -p 7860:7860 face-inference:latest

# Test
curl http://localhost:7860/health
```

## Rollback

If remote service fails, the app automatically falls back to local inference. No downtime.

To disable remote and use local only:
```bash
# Unset or remove INFERENCE_SERVICE_URL
unset INFERENCE_SERVICE_URL
```

## Next Steps

1. **Deploy inference service** to HF Spaces (this guide)
2. **Test remote endpoints** with sample frames
3. **Update main app config** with service URL
4. **Monitor live attendance** to ensure recognition works
5. **Optimize** model selection if needed (buffalo_l vs buffalo_s vs others)

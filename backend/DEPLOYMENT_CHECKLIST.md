# HF Spaces Deployment Checklist

## ✅ Pre-Deployment (Local)

- [ ] Review `inference_service/` files:
  - `app.py` — FastAPI inference service
  - `requirements.txt` — Python dependencies
  - `Dockerfile` — Container config
  - `README.md` — API documentation

- [ ] Test inference service locally (optional):
  ```bash
  cd inference_service
  docker build -t face-inference .
  docker run -p 7860:7860 face-inference
  curl http://localhost:7860/health
  ```

## 🚀 Deploy to Hugging Face Spaces

- [ ] Create HF account: https://huggingface.co
- [ ] Create new Space:
  - Go https://huggingface.co/new-space
  - Name: `face-inference-service`
  - SDK: **Docker**
  - License: MIT
  - Click **Create**

- [ ] Upload files to space:
  ```bash
  git clone https://huggingface.co/spaces/YOUR_USERNAME/face-inference-service
  cd face-inference-service
  
  # Copy files from inference_service/
  cp ../inference_service/* .
  
  git add .
  git commit -m "Initial face inference service"
  git push
  ```
  
  Or use web UI to upload files directly.

- [ ] Wait for build (2-5 min)
  - Watch space page for build logs
  - Green checkmark = ready
  - Note space URL: `https://YOUR_USERNAME-face-inference-service.hf.space`

## 🔧 Configure Main App

- [ ] Add to `.env` file:
  ```
  INFERENCE_SERVICE_URL=https://YOUR_USERNAME-face-inference-service.hf.space
  ```

- [ ] Test connection:
  ```bash
  cd project_root
  curl https://YOUR_USERNAME-face-inference-service.hf.space/health
  ```
  Should return: `{"status": "healthy", "service": "face-inference"}`

- [ ] Install updated requirements:
  ```bash
  pip install -r requirements.txt
  ```

- [ ] (Optional) Update attendance routes to use remote:
  See `INFERENCE_INTEGRATION_EXAMPLE.py` for sample code.

## ✨ Test Live Attendance

- [ ] Start main app:
  ```bash
  python run.py
  ```

- [ ] Login and start live attendance

- [ ] Check logs:
  - Main app: Should show "Using REMOTE inference" or fallback message
  - HF Space: View logs to see processing

- [ ] If fails, fallback to local inference automatically

## 📊 Monitor

- [ ] **HF Space logs**: Click space → **View logs** tab
- **Main app logs**: Watch Flask output for inference mode
- **Costs**: Check HF Space dashboard for usage/billing

## 🎯 Optimization (Optional)

- [ ] Toggle inference mode:
  - Set `INFERENCE_SERVICE_URL` to use remote
  - Unset to use local only
  - No restart needed

- [ ] Upgrade HF Space tier if needed:
  - Free: CPU only, may idle
  - Paid: T4 GPU (~$10/month), always-on
  - Go to Space **Settings** → **Hardware**

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Space build fails | Check build logs; ensure Python 3.10+ compatible |
| `Inference service timeout` | HF free tier may take 30-60s to wake; upgrade to GPU tier |
| `Connection refused` | Check `INFERENCE_SERVICE_URL` is correct |
| Recognition is slow | Remote inference slower than local; consider GPU tier |
| App works but inference fails | Check space logs for model loading errors |

## Rollback

If you want to use local inference only:
1. Remove or comment out `INFERENCE_SERVICE_URL` in `.env`
2. No code changes needed; automatic fallback
3. Restart app

---

**Questions?** Check:
- `DEPLOYMENT_GUIDE.md` — Full details
- `inference_service/README.md` — API docs
- `INFERENCE_INTEGRATION_EXAMPLE.py` — Code example

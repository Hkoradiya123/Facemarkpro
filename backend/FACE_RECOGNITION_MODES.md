# 🔄 Face Recognition Mode Selector

## Three Modes Available

### 1️⃣ **HYBRID MODE** (Default & Recommended)
```env
FACE_RECOGNITION_MODE=hybrid
INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space
```

**Behavior:**
- ✅ Try to use **REMOTE service** first (HF Spaces)
- ✅ If remote fails/unavailable → automatically fall back to **LOCAL**
- 🎯 Best for: Production (most reliable)

**Logs when working:**
```
✓ Face Recognition Mode: HYBRID
✓ Remote inference service connected
✓ Got embedding from REMOTE service
✓ Recognized 5 faces via REMOTE service
```

**Logs when fallback happens:**
```
✓ Face Recognition Mode: HYBRID
✓ Remote inference service connected
Remote recognition error: Connection timeout, falling back to local
✓ Recognized 5 faces via LOCAL service
```

---

### 2️⃣ **REMOTE ONLY MODE**
```env
FACE_RECOGNITION_MODE=remote
INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space
```

**Behavior:**
- 🚀 **ALWAYS use REMOTE service** (HF Spaces)
- ❌ NO fallback to local
- ⚠️ Will error if remote is unavailable
- 🎯 Best for: Cloud deployment, testing remote service

**Logs:**
```
✓ Face Recognition Mode: REMOTE
✓ Remote inference service connected
✓ Got embedding from REMOTE service
✓ Recognized 5 faces via REMOTE service
```

**If remote fails:**
```
ERROR: Remote mode requested but service unavailable!
```

---

### 3️⃣ **LOCAL ONLY MODE**
```env
FACE_RECOGNITION_MODE=local
# (INFERENCE_SERVICE_URL is ignored)
```

**Behavior:**
- 📱 **ALWAYS use LOCAL service** (no HF Spaces)
- ❌ Remote service is completely ignored
- ✅ Works offline, no network required
- 🎯 Best for: Local development, offline testing

**Logs:**
```
✓ Face Recognition Mode: LOCAL
ℹ FORCED LOCAL mode - will not use remote service
✓ Got embedding from LOCAL service
✓ Recognized 5 faces via LOCAL service
```

---

## 📋 Which Mode to Use?

| Use Case | Mode | Reason |
|----------|------|--------|
| **Production** | `hybrid` | Reliability - uses fast remote, falls back to local |
| **Testing Remote Service** | `remote` | Test HF Spaces without fallback |
| **Development Offline** | `local` | No network needed, fast iteration |
| **Low Bandwidth** | `local` | Don't send images over internet |
| **GPU Available Locally** | `local` | Use local GPU power |
| **Minimal Local Resources** | `remote` | Offload everything to cloud |

---

## 🔧 How to Switch Modes

### Quick Switch in `.env`:

**Current (Hybrid):**
```env
FACE_RECOGNITION_MODE=hybrid
INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space
```

**Switch to Remote Only:**
```env
FACE_RECOGNITION_MODE=remote
INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space
```

**Switch to Local Only:**
```env
FACE_RECOGNITION_MODE=local
# INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space  (commented out)
```

Then **restart your Flask app**:
```powershell
# Kill current process (Ctrl+C)
python run.py
```

---

## 📊 Log Examples for Each Mode

### Hybrid Mode Startup
```
2026-03-05 23:50:00,123 [INFO] app.services.face_recognition: ✓ Face Recognition Mode: HYBRID
2026-03-05 23:50:00,456 [INFO] app.utils.inference_client: ✓ Inference service healthy: https://jinksQspider-fmproService.hf.space
2026-03-05 23:50:00,789 [INFO] app.services.face_recognition: ✓ Remote inference service connected
```

### Remote Only Mode Startup
```
2026-03-05 23:50:00,123 [INFO] app.services.face_recognition: ✓ Face Recognition Mode: REMOTE
2026-03-05 23:50:00,456 [INFO] app.utils.inference_client: ✓ Inference service healthy: https://jinksQspider-fmproService.hf.space
2026-03-05 23:50:00,789 [INFO] app.services.face_recognition: ✓ Remote inference service connected
2026-03-05 23:50:00,790 [INFO] app.services.face_recognition: ℹ FORCED REMOTE mode - will not fall back to local
```

### Local Only Mode Startup
```
2026-03-05 23:50:00,123 [INFO] app.services.face_recognition: ✓ Face Recognition Mode: LOCAL
2026-03-05 23:50:00,456 [INFO] app.services.face_recognition: ℹ FORCED LOCAL mode - will not use remote service
2026-03-05 23:50:00,789 [INFO] app.services.face_recognition: Loading face recognition model...
```

---

## ⚠️ Error Scenarios

### Remote Mode + Service Down
```env
FACE_RECOGNITION_MODE=remote
INFERENCE_SERVICE_URL=https://jinksQspider-fmproService.hf.space
```

**Startup log:**
```
2026-03-05 23:50:00,123 [INFO] app.services.face_recognition: ✓ Face Recognition Mode: REMOTE
2026-03-05 23:50:00,456 [ERROR] app.utils.inference_client: Cannot reach inference service: ConnectionError
2026-03-05 23:50:00,789 [ERROR] app.services.face_recognition: ERROR: Remote mode requested but service unavailable!
RuntimeError: Remote service unavailable and mode set to 'remote'
```

**Solution:** 
- Switch to `hybrid` mode, OR
- Fix the remote service, OR
- Switch to `local` mode

---

## 🎯 Performance Comparison

| Metric | Local | Remote | Hybrid |
|--------|-------|--------|--------|
| **Startup Time** | ~5-10s (loads model) | Instant | Instant |
| **Inference Speed** | 2-5s per frame | 3-8s per frame (+ network) | Same as Remote (or Local fallback) |
| **CPU Usage** | 100% (on main server) | ~5% (offloaded) | ~5% (offloaded) |
| **Network Usage** | None | High (base64 images) | Medium (only if remote fails) |
| **Offline Support** | ✅ Yes | ❌ No | ✅ Yes (with fallback) |
| **Reliability** | Single point of failure | Depends on network/HF Spaces | ✅ Very reliable |

---

## 📝 Summary

```
HYBRID MODE (Recommended for production)
├─ Remote service available? → Use remote (fast, offloaded)
└─ Remote unavailable? → Fall back to local (just works)

REMOTE MODE (Test/Cloud only)
├─ Always use remote
└─ Error if service unavailable

LOCAL MODE (Development/Offline)
└─ Always use local (ignore remote)
```

**Default:** `hybrid` ✅
**Tested:** All three modes working
**Recommended:** `hybrid` for production


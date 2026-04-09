# Enable HTTPS for Camera Access

## Problem
Modern browsers require HTTPS (or localhost) to access camera/microphone. When accessing your app from network devices (e.g., `http://192.168.1.3:7860`), camera access will be blocked.

## Quick Solution

### Step 1: Install cryptography
```bash
pip install cryptography
```

### Step 2: Generate SSL Certificate
```bash
python generate_cert.py
```

This creates:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

### Step 3: Enable HTTPS in .env
Add or update your `.env` file:
```
USE_HTTPS=true
```

### Step 4: Restart the App
```bash
python run.py
```

### Step 5: Access via HTTPS
Open your browser and go to:
- `https://localhost:7860` (on same machine)
- `https://192.168.1.3:7860` (from other devices, replace with your IP)

### Step 6: Accept Security Warning
Since this is a self-signed certificate, your browser will show a warning:
1. Click **"Advanced"** or **"Show Details"**
2. Click **"Proceed to localhost (unsafe)"** or **"Accept the Risk and Continue"**
3. This is safe for local development

## Alternative: Use Localhost Only
If you're testing on the same machine, simply access via:
```
http://localhost:7860
```
No HTTPS needed! Camera will work on localhost even with HTTP.

## For Production (Hugging Face Spaces)
No configuration needed! Hugging Face provides HTTPS automatically.

## Troubleshooting

### "Camera access is not supported"
- Make sure you're using HTTPS or localhost
- Use a modern browser (Chrome, Firefox, Edge)
- Avoid using Internet Explorer

### "Permission denied"
- Click the camera icon in the browser address bar
- Select "Allow" for camera access
- Refresh the page

### "No camera found"
- Check if your camera is connected
- Close other apps that might be using the camera (Zoom, Teams, etc.)
- Try a different browser

### Certificate errors
If you see certificate errors after regenerating:
1. Clear browser cache/cookies for localhost
2. Close all browser windows
3. Restart the browser
4. Try again

## Security Notes
⚠ The generated certificate is **self-signed** and only for **local development**
⚠ Never use self-signed certificates in production
✓ For production, use proper SSL certificates (Let's Encrypt, etc.)

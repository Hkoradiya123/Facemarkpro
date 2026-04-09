# Hugging Face Spaces Deployment Guide

## Prerequisites

1. A Hugging Face account (sign up at https://huggingface.co)
2. MongoDB Atlas account (or any MongoDB instance)
3. Your project code ready

## Step-by-Step Deployment

### 1. Create a New Space

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Fill in the details:
   - **Space name**: `facemarkpro` (or your preferred name)
   - **License**: MIT
   - **SDK**: Docker
   - **Visibility**: Public or Private

### 2. Configure MongoDB

1. Go to MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
2. Create a free cluster if you don't have one
3. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

### 3. Set Environment Variables

In your Hugging Face Space settings:

1. Go to your Space → Settings → Variables and secrets
2. Add the following secrets:
   - `MONGODB_URI`: Your MongoDB connection string
   - `SECRET_KEY`: A random secret key (generate with `python -c "import os; print(os.urandom(24).hex())"`)

### 4. Upload Your Code

#### Option A: Using Git

```bash
# Clone your space repository
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
cd YOUR_SPACE_NAME

# Copy your project files
cp -r /path/to/your/project/* .

# Commit and push
git add .
git commit -m "Initial deployment"
git push
```

#### Option B: Using the Web Interface

1. Go to your Space → Files
2. Upload all project files:
   - `app/` directory
   - `run.py`
   - `requirements.txt`
   - `Dockerfile`
   - `README.md`
   - Other necessary files

### 5. Required Files Checklist

Make sure these files are present:

- ✅ `README.md` (with Hugging Face metadata)
- ✅ `Dockerfile`
- ✅ `requirements.txt`
- ✅ `run.py`
- ✅ `app/__init__.py`
- ✅ `app/` directory with all routes and templates
- ✅ `.gitignore` (to exclude sensitive files)

### 6. Monitor Deployment

1. Go to your Space page
2. Check the "Logs" tab for build progress
3. Wait for the build to complete (usually 5-10 minutes)
4. Once built, your app will be available at:
   `https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME`

### 7. Initial Setup

After deployment:

1. Access your Space URL
2. The app should redirect to the login page
3. You may need to create initial admin/faculty users using the MongoDB interface or setup scripts

## Troubleshooting

### Build Fails

- Check the logs for specific errors
- Ensure all dependencies in `requirements.txt` are correct
- Verify Dockerfile syntax

### Database Connection Issues

- Verify MongoDB URI is correct
- Check if MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
- Ensure database user has proper permissions

### Application Errors

- Check application logs in the Space
- Verify environment variables are set correctly
- Ensure all required directories are created

## Important Notes

### File Persistence

- Hugging Face Spaces use ephemeral storage
- Uploaded files will be lost on restart
- Use MongoDB or external storage for persistent data
- The app uses `/tmp` directory for temporary files

### Performance

- Free tier has limited resources
- Consider upgrading for production use
- Face recognition may be slower on free tier

### Security

- Never commit `.env` file with secrets
- Use Hugging Face Secrets for sensitive data
- Enable authentication for production
- Use HTTPS (automatically provided by Hugging Face)

## Updating Your Space

To update your deployed app:

```bash
# Make changes to your code
git add .
git commit -m "Update: description of changes"
git push
```

The Space will automatically rebuild and redeploy.

## Support

- Hugging Face Docs: https://huggingface.co/docs/hub/spaces
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Project Issues: Create an issue in your repository

## Production Checklist

Before going to production:

- [ ] Set strong SECRET_KEY
- [ ] Configure MongoDB with proper security
- [ ] Set up backup strategy
- [ ] Enable rate limiting
- [ ] Add monitoring and logging
- [ ] Test all features thoroughly
- [ ] Set up error tracking
- [ ] Configure proper CORS if needed
- [ ] Review and update security settings

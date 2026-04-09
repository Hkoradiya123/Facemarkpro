FROM python:3.10

WORKDIR /app

# Install system dependencies for opencv and insightface
RUN apt-get update && apt-get install -y \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY static/ ./static/

# Set environment variables
ENV FACE_RECOGNITION_MODEL="buffalo_l"
ENV PORT=7860

# Expose port
EXPOSE 7860

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Run application
CMD ["python", "app.py"]

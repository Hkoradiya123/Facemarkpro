# Use a Linux base image suitable for Python 3.10
FROM python:3.10-slim-buster

# Install the necessary system dependencies for OpenCV
# libgl1 is often the core missing piece (libGL.so.1)
# libsm6 and libxext6 are also commonly required for image processing/display
RUN apt-get update && apt-get install -y \
    libgl1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Use the same start command, but without the single quotes (optional but cleaner in Docker)
CMD gunicorn 'app:create_app()' -b 0.0.0.0:8080

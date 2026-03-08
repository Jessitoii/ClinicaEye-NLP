# AI Service using FastAPI and ONNX CPU Optimization
FROM python:3.10-slim

# Create working directory
WORKDIR /app

# Install curl for healthcheck validation during orchestration
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the dependency index
COPY requirements.txt .

# Environment optimized variables for ONNX CPU execution
ENV OMP_NUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Install requirements with no cache
# Assuming ONNX Runtime inference is defined explicitly in requirements.txt (e.g., onnxruntime)
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic code
COPY . .

# NOTE: /app/models is dynamically mounted from host via docker-compose to keep image size small

# Give the server an open port
EXPOSE 8000

# Start Uvicorn pointing at the core FastAPI app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

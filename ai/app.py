import os
import time
import re
import uuid
import torch
import numpy as np
import logging
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import uvicorn
from transformers import AutoTokenizer, BertForSequenceClassification
from scripts.train_pipeline import XAIExplainer

# No Sugarcoating: Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clinicaeye-nlp-service")

app = FastAPI(title="ClinicaEye-NLP Inference Service")

# ----------------- CONSTANTS -----------------
DISEASE_CLASSES = [
    "Cataract", "Conjunctivitis", "Diabetic Retinopathy", 
    "Dry Eye Syndrome", "Glaucoma", "Macular Degeneration", 
    "Retinal Detachment", "Uveitis"
]

ABBREVIATIONS = {
    r"\bdr\b": "diabetic retinopathy",
    r"\bamd\b": "macular degeneration",
    r"\bdes\b": "dry eye syndrome",
    r"\bgc\b": "glaucoma",
    r"\bpdr\b": "diabetic retinopathy",
    r"\bnpdr\b": "diabetic retinopathy",
    r"\bcataract\w*\b": "cataract",
    r"\bconjunctivitis\w*\b": "conjunctivitis",
    r"\buveitis\w*\b": "uveitis"
}

# ----------------- PATHS -----------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "final_model")
PYTORCH_PATH = os.path.join(MODEL_DIR, "pytorch")
ONNX_PATH = os.path.join(MODEL_DIR, "onnx", "model.onnx")

# ----------------- STATE -----------------
# We load the PyTorch model for now because ONNX creation is failing build in this environment (Python 3.14).
# This is a fallback to guarantee service availability while maintaining < 2s latency.
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

try:
    logger.info(f"Loading tokenizer from {PYTORCH_PATH}")
    tokenizer = AutoTokenizer.from_pretrained(PYTORCH_PATH)
    
    logger.info(f"Loading PyTorch weights from {PYTORCH_PATH}")
    model = BertForSequenceClassification.from_pretrained(PYTORCH_PATH)
    model.to(device)
    model.eval()
    
    # Initialize XAIExplainer
    explainer = XAIExplainer(model, tokenizer)
except Exception as e:
    logger.error(f"CRITICAL: Failed to load model weights. Have you completed the training yet? Error: {e}")
    model = None
    tokenizer = None
    explainer = None

# ----------------- UTILS -----------------
def clean_text(text: str) -> str:
    """Mirrors data_engine.py preprocessing logic exactly."""
    if not isinstance(text, str):
        return ""
    
    text = text.lower()
    # Remove non-alphanumeric except spaces, hyphens and dots
    text = re.sub(r'[^a-z0-9\s\.\-]', ' ', text)
    
    # Expand abbreviations
    for pattern, replacement in ABBREVIATIONS.items():
        text = re.sub(pattern, replacement, text)
        
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# ----------------- MODELS -----------------
class PredictRequest(BaseModel):
    text: str

class Explanation(BaseModel):
    word: str
    score: float

class ClassExplanation(BaseModel):
    disease_class: str
    explanations: List[Explanation]

class PredictResponse(BaseModel):
    id: str
    text: str
    latency_ms: float
    predictions: List[Dict]
    highlight_zones: List[ClassExplanation]

# API Wrapper (Standardized for Frontend)
class StandardResponse(BaseModel):
    status: str = "success"
    data: Optional[Dict] = None
    message: Optional[str] = None
    metadata: Dict

# ----------------- ENDPOINTS -----------------
@app.post("/api/v1/predict", response_model=StandardResponse)
@app.post("/api/v1/analyze", response_model=StandardResponse)
async def predict(request: PredictRequest, explain: bool = Query(False)):
    start_time = time.time()
    
    # Garbage Input check
    if not request.text.strip():
        return {
            "status": "error",
            "message": "Empty or garbage input rejected.",
            "metadata": {"latency_ms": 0, "request_id": str(uuid.uuid4())}
        }
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Ensure training/dry-run finished.")

    try:
        cleaned = clean_text(request.text)
        inputs = tokenizer(cleaned, return_tensors="pt", truncation=True, max_length=512, padding=True).to(device)
        
        with torch.no_grad():
            outputs = model(**inputs)
            # Standard: Access .logits BEFORE any tensor operations
            logits = outputs.logits
            probs = torch.sigmoid(logits).cpu().numpy()[0]
            
        predictions = []
        for i, cls in enumerate(DISEASE_CLASSES):
            predictions.append({"class": cls, "probability": float(probs[i])})
            
        # XAI logic
        highlight_zones = []
        logger.info(f"AI_EXPLAIN_REQUESTED: {explain}")
        
        if explain and explainer:
            # First, check classes > threshold
            for i, p in enumerate(probs):
                if p >= 0.5:
                    importance_scores = explainer.explain(cleaned, i)
                    if importance_scores:
                        highlight_zones.append({
                            "disease_class": DISEASE_CLASSES[i],
                            "explanations": [Explanation(**item) for item in importance_scores]
                        })
            
            # Additional Safeguard: If no class > 0.5 but requested, explain the max class
            if not highlight_zones:
                max_idx = int(np.argmax(probs)) # Use probs, not logits tensor here
                logger.info(f"FALLBACK_EXPLAIN: No class > 0.5. Explaining max class: {DISEASE_CLASSES[max_idx]}")
                importance_scores = explainer.explain(cleaned, max_idx)
                if importance_scores:
                    highlight_zones.append({
                        "disease_class": DISEASE_CLASSES[max_idx],
                        "explanations": [Explanation(**item) for item in importance_scores]
                    })
                else:
                    logger.warning("FALLBACK_EXPLAIN_FAILED: Explainer returned empty results.")

        latency = (time.time() - start_time) * 1000
        logger.info(f"PREDICTION_COMPLETE: Latency={latency:.2f}ms, Highlights={len(highlight_zones)}")
        
        response_data = {
            "id": str(uuid.uuid4()),
            "text": request.text,
            "latency_ms": latency,
            "predictions": predictions,
            "highlight_zones": highlight_zones
        }
        
        return {
            "status": "success",
            "data": response_data,
            "metadata": {
                "latency_ms": latency,
                "request_id": response_data["id"]
            }
        }
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Inference engine failure: {str(e)}"
        )

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

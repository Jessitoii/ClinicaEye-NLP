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
from captum.attr import LayerIntegratedGradients

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
    
    # Captum wrapper: Transformers models return SequenceClassifierOutput, but Captum needs a Tensor of logits.
    def forward_func(input_ids):
        return model(input_ids).logits

    # Initialize Captum for XAI
    lig = LayerIntegratedGradients(forward_func, model.bert.embeddings)
except Exception as e:
    logger.error(f"CRITICAL: Failed to load model weights. Have you completed the training yet? Error: {e}")
    model = None
    tokenizer = None

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

class PredictionResult(BaseModel):
    disease: str
    confidence: float

class PredictResponse(BaseModel):
    id: str
    text: str
    latency_ms: float
    predictions: List[Dict]
    highlight_zones: List[Dict]

# API Wrapper (Standardized for Frontend)
class StandardResponse(BaseModel):
    status: str = "success"
    data: Optional[Dict] = None
    message: Optional[str] = None
    metadata: Dict

# ----------------- ENDPOINTS -----------------
@app.post("/api/v1/predict", response_model=StandardResponse)
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
            logits = outputs.logits.cpu().numpy()[0]
            probs = sigmoid(logits)
            
        predictions = []
        for i, cls in enumerate(DISEASE_CLASSES):
            predictions.append({"class": cls, "probability": float(probs[i])})
            
        # XAI logic
        highlight_zones = []
        if explain:
            # We use Captum for Word Importance
            # Note: This is computationally more expensive but integrated here for visibility.
            # We take the max class or just general attribution? Usually, we attribute for the positive classes.
            # For simplicity, we attribute for the combined max logit or highest probability class.
            target_idx = int(np.argmax(logits))
            
            # Simple baseline: all zeros
            input_ids = inputs['input_ids']
            baseline = torch.zeros_like(input_ids)
            
            attributions, _ = lig.attribute(
                inputs=input_ids,
                baselines=baseline,
                target=target_idx,
                return_convergence_delta=True
            )
            
            # Summarize attribution per token
            attributions = attributions.sum(dim=-1).squeeze(0)
            attributions = attributions / torch.norm(attributions) # Normalize
            
            attr_np = attributions.cpu().detach().numpy()
            tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
            
            for token, importance in zip(tokens, attr_np):
                if token in ["[CLS]", "[SEP]", "[PAD]"]:
                    continue
                highlight_zones.append({"word": token, "importance": float(importance)})

        latency = (time.time() - start_time) * 1000
        
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
        return {
            "status": "error",
            "message": f"Inference engine failure: {str(e)}",
            "metadata": {"latency_ms": (time.time() - start_time) * 1000, "request_id": str(uuid.uuid4())}
        }

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

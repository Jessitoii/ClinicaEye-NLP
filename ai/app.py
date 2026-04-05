import os
import time
import re
import uuid
import torch
import torch.nn as nn
import numpy as np
import logging
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Query, File, UploadFile, Form
from pydantic import BaseModel
import uvicorn
from transformers import AutoTokenizer, BertForSequenceClassification
import torchvision.models as models
from torchvision import transforms

from scripts.train_pipeline import XAIExplainer
from scripts.preprocess_fundus import preprocess_image, VisionExplainer

# No Sugarcoating: Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clinicaeye-nlp-vision-service")

app = FastAPI(title="ClinicaEye-NLP Multi-Modal Inference Service")

# ----------------- CONSTANTS -----------------
DISEASE_CLASSES_NLP = [
    "Cataract", "Conjunctivitis", "Diabetic Retinopathy", 
    "Dry Eye Syndrome", "Glaucoma", "Macular Degeneration", 
    "Retinal Detachment", "Uveitis"
]

DISEASE_CLASSES_VISION = [
    "Normal", "Diabetes", "Glaucoma", "Cataract", 
    "AMD", "Hypertension", "Myopia", "Other"
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
VISION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "odir_efficientnet_b4.pth")

# ----------------- STATE -----------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

# NLP Model Loading
nlp_model = None
nlp_tokenizer = None
nlp_explainer = None

try:
    logger.info(f"Loading tokenizer from {PYTORCH_PATH}")
    nlp_tokenizer = AutoTokenizer.from_pretrained(PYTORCH_PATH)
    
    logger.info(f"Loading PyTorch text weights from {PYTORCH_PATH}")
    nlp_model = BertForSequenceClassification.from_pretrained(PYTORCH_PATH)
    nlp_model.to(device)
    nlp_model.eval()
    
    nlp_explainer = XAIExplainer(nlp_model, nlp_tokenizer)
except Exception as e:
    logger.error(f"Text Model Error: {e}")

# Vision Model Loading
vision_model = None
vision_explainer = None

logger.info("Initializing EfficientNet-B4...")
vision_base = models.efficientnet_b4(weights=None)
# Adapt output layer
num_ftrs = vision_base.classifier[1].in_features
vision_base.classifier[1] = nn.Linear(num_ftrs, len(DISEASE_CLASSES_VISION))


if os.path.exists(VISION_MODEL_PATH):
    logger.info(f"Loading vision model weights from {VISION_MODEL_PATH}")
    try:
        vision_base.load_state_dict(torch.load(VISION_MODEL_PATH, map_location=device))
        vision_model = vision_base.to(device)
        vision_model.eval()
        
        # Target layer for Grad-CAM in EfficientNet is usually features[-1]
        target_layer = vision_model.features[-1]
        vision_explainer = VisionExplainer(vision_model, target_layer)
        logger.info("Vision model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load vision model: {e}")
        vision_model = None
else:
    logger.error(f"VISION_MODEL_NOT_FOUND: {VISION_MODEL_PATH}")

# Optional Vision transforms
vision_transform = transforms.Compose([
    transforms.ToTensor(), # Converts [0,255] -> [0.0, 1.0] and HWC -> CHW
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ----------------- UTILS -----------------
def clean_text(text: str) -> str:
    """Mirrors data_engine.py preprocessing logic exactly."""
    if not isinstance(text, str):
        return ""
    
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\.\-]', ' ', text)
    for pattern, replacement in ABBREVIATIONS.items():
        text = re.sub(pattern, replacement, text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ----------------- MODELS -----------------
class Explanation(BaseModel):
    word: str
    score: float

class ClassExplanation(BaseModel):
    disease_class: str
    explanations: List[Explanation]

class VisualExplanation(BaseModel):
    disease_class: str
    heatmap_base64: str

# API Wrapper (Standardized for Frontend)
class StandardResponse(BaseModel):
    status: str = "success"
    data: Optional[Dict] = None
    message: Optional[str] = None
    metadata: Dict

# ----------------- ENDPOINTS -----------------
@app.post("/api/v1/analyze", response_model=StandardResponse)
async def analyze(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    explain: bool = Query(False)
):
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    if not text and not image:
        return {
            "status": "error",
            "message": "Must provide either text or an image payload.",
            "metadata": {"latency_ms": 0, "request_id": request_id}
        }
    
    response_data = {"id": request_id}
    
    # --- NLP Processing ---
    if text and text.strip():
        if nlp_model is None or nlp_tokenizer is None:
            raise HTTPException(status_code=503, detail="NLP_MODEL_WEIGHTS_NOT_FOUND")
            
        try:
            cleaned = clean_text(text)
            inputs = nlp_tokenizer(cleaned, return_tensors="pt", truncation=True, max_length=512, padding=True).to(device)
            
            with torch.no_grad():
                outputs = nlp_model(**inputs)
                logits = outputs.logits
                probs = torch.sigmoid(logits).cpu().numpy()[0]
                
            predictions = []
            for i, cls in enumerate(DISEASE_CLASSES_NLP):
                predictions.append({"class": cls, "probability": float(probs[i])})
                
            highlight_zones = []
            if explain and nlp_explainer:
                for i, p in enumerate(probs):
                    if p >= 0.5:
                        importance_scores = nlp_explainer.explain(cleaned, i)
                        if importance_scores:
                            highlight_zones.append({
                                "disease_class": DISEASE_CLASSES_NLP[i],
                                "explanations": [Explanation(**item) for item in importance_scores]
                            })
                if not highlight_zones:
                    max_idx = int(np.argmax(probs))
                    importance_scores = nlp_explainer.explain(cleaned, max_idx)
                    if importance_scores:
                        highlight_zones.append({
                            "disease_class": DISEASE_CLASSES_NLP[max_idx],
                            "explanations": [Explanation(**item) for item in importance_scores]
                        })

            response_data["nlp_results"] = {
                "text": text,
                "predictions": predictions,
                "highlight_zones": highlight_zones
            }
        except Exception as e:
            logger.error(f"NLP failed: {e}")
            raise HTTPException(status_code=500, detail=f"NLP engine failure: {str(e)}")

    # --- Vision Processing ---
    if image:
        if vision_model is None:
            raise HTTPException(status_code=503, detail="VISION_MODEL_WEIGHTS_NOT_FOUND")
            
        try:
            image_bytes = await image.read()
            processed_img_np = preprocess_image(image_bytes, image_size=380)
            
            input_tensor = vision_transform(processed_img_np).unsqueeze(0).to(device)
            
            with torch.no_grad():
                logits = vision_model(input_tensor)
                probs = torch.sigmoid(logits).cpu().numpy()[0]
                
            predictions = []
            for i, cls in enumerate(DISEASE_CLASSES_VISION):
                predictions.append({"class": cls, "probability": float(probs[i])})
                
            visual_highlights = []
            if explain and vision_explainer:
                input_tensor.requires_grad = True # For Grad-CAM
                
                for i, p in enumerate(probs):
                    if p >= 0.5:
                        b64_img = vision_explainer.explain(input_tensor, i, processed_img_np)
                        visual_highlights.append({
                            "disease_class": DISEASE_CLASSES_VISION[i],
                            "heatmap_base64": b64_img
                        })
                        
                if not visual_highlights:
                    max_idx = int(np.argmax(probs))
                    b64_img = vision_explainer.explain(input_tensor, max_idx, processed_img_np)
                    visual_highlights.append({
                        "disease_class": DISEASE_CLASSES_VISION[max_idx],
                        "heatmap_base64": b64_img
                    })
                    
            response_data["visual_results"] = {
                "predictions": predictions,
                "highlight_zones": visual_highlights
            }
        except Exception as e:
            logger.error(f"Vision failed: {e}")
            raise HTTPException(status_code=500, detail=f"Vision engine failure: {str(e)}")

    latency = (time.time() - start_time) * 1000
    
    return {
        "status": "success",
        "data": response_data,
        "metadata": {
            "latency_ms": latency,
            "request_id": request_id
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "nlp_model_loaded": nlp_model is not None,
        "vision_model_loaded": vision_model is not None
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

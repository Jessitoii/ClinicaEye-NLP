# ClinicaEye-NLP: AI Inference Service

The "Brain" of the application. A **FastAPI** service fine-tuned for ophthalmic clinical notes.

## Model Details
- **Base Architecture**: BioBERT (v1.1) / DistilBERT.
- **Target**: Multi-label classification (8 medical intent types).
- **Performance**: $F_1$-Score $\ge$ 85%.

## XAI Integration (Explainable AI)
We use **Captum** to provide word-level attribution. Clinicians can see *why* the AI flagged a specific note, highlighting key ophthalmic terms.

## Data Harmonization
The training pipeline merges:
1. **17k Kaggle rows**: Structured clinical records.
2. **33k Eye-QA rows**: Unstructured Q&A pairs translated to label-intent.

## Deployment Notes
Model weights (`.safetensors`) are too large for standard Git. 
- Use Git LFS for `ai/models/final_model/`.
- Or download production weights manually via the internal S3/Azure Blob bucket.

## Setup
1. Create venv: `python -m venv venv`
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `uvicorn main:app --reload --port 8000`

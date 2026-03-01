# ClinicaEye-NLP: Training Strategy

## 1. Model & Architecture
- **Base Model:** `dmis-lab/biobert-v1.1-pubmed`
  - *Fallback:* `distilbert-base-uncased` (if resource constraints limit the 512 sequence length significantly).
- **Architecture:** BERT encoder + Multi-label classification head.
- **Loss Function:** `BCEWithLogitsLoss`.

## 2. Hyperparameters & Optimization
- **Max Sequence Length:** 512 (to ensure full context of clinical notes and QA pairs).
- **Effective Batch Size:** 16
  - **Per-Device Batch Size:** 4 or 8 (depending on hardware).
  - **Gradient Accumulation Steps:** 4 or 2 (to maintain the effective batch size without OOM).
- **Learning Rate:** 3e-5 (standard for fine-tuning BERT on medical domains).
- **Epochs:** 10 (paired with early stopping).
- **Early Stopping:** `EarlyStoppingCallback` monitored on `eval_loss` with a patience of 3 epochs.
- **Optimizer:** `AdamW` with weight decay (0.01).
- **Scheduler:** Linear learning rate scheduler with 10% warmup steps.

## 3. Data Strategy
- **Training Set:** Generated dynamically by splitting 80-90% of `train.parquet` for pure training.
- **Validation Set:** The remaining 10-20% of `train.parquet` will be purely used for `eval_loss` monitoring and early stopping.
- **Test Set:** `test.parquet` will remain untouched until the conclusion of the training pipeline, acting strictly as the hold-out evaluation dataset.

## 4. Metrics & Targets
- **Target:** $F_1 \ge 85\%$
- **Tracked Metrics:** Micro & Macro $F_1$, Precision, Recall.

## 5. XAI Integration (Explainability)
- **Tooling:** Captum (Integrated Gradients) / Native attention maps.
- **Implementation:** During post-training evaluation or integrated directly into the `train_pipeline.py`, we will use Captum to assign word importances for model predictions.
- **Objective:** To provide an explainable feature set so clinicians can see exactly *which* tokens drove a "Diabetic Retinopathy" or "Glaucoma" label. We will save out attribution map samples or configure the system to stream these values.

## 6. Export & Inference
- **ONNX Optimization:** Convert the optimal PyTorch checkpoint to ONNX format.
- **Tokenizer Export:** The tokenizer configuration (`tokenizer_config.json`, `vocab.txt`, etc.) **MUST** be explicitly exported alongside `model.onnx` inside `./ai/models/final_model/`. This is critical for the FastAPI service.
- **Latency Goal:** < 2s on inference; effectively we expect < 100ms via ONNX on CPU.

import os
import argparse
import logging
import torch
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, precision_score, recall_score
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    EvalPrediction
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DISEASE_CLASSES = [
    "Cataract", "Conjunctivitis", "Diabetic Retinopathy",
    "Dry Eye Syndrome", "Glaucoma", "Macular Degeneration",
    "Retinal Detachment", "Uveitis"
]

def compute_metrics(p: EvalPrediction):
    preds = torch.tensor(p.predictions)
    # Apply sigmoid since we use BCEWithLogitsLoss
    probs = torch.sigmoid(preds)
    # Binary predictions with 0.5 threshold
    y_pred = (probs >= 0.5).numpy()
    y_true = p.label_ids

    # Calculate metrics
    f1_micro = f1_score(y_true, y_pred, average='micro', zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average='macro', zero_division=0)
    precision = precision_score(y_true, y_pred, average='macro', zero_division=0)
    recall = recall_score(y_true, y_pred, average='macro', zero_division=0)
    
    return {
        "f1_micro": f1_micro,
        "f1_macro": f1_macro,
        "precision_macro": precision,
        "recall_macro": recall
    }

class MultiLabelDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx], dtype=torch.float32)
        return item

    def __len__(self):
        return len(self.labels)

def main(args):
    project_root = Path(__file__).parent.parent.parent
    data_dir = project_root / "Data" / "Processed"
    model_output_dir = project_root / "ai" / "models" / "final_model"
    checkpoint_dir = project_root / "ai" / "models" / "checkpoints"
    
    model_output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    logging.info(f"Loading data from {data_dir}...")
    try:
        train_df = pd.read_parquet(data_dir / "train.parquet")
        test_df = pd.read_parquet(data_dir / "test.parquet")
    except Exception as e:
        logging.error(f"Failed to load data: {e}")
        return
    
    if args.dry_run:
        logging.info("DRY RUN MODE: Subsampling data to 500 train, 100 test samples...")
        train_df = train_df.sample(min(500, len(train_df)), random_state=42)
        test_df = test_df.sample(min(100, len(test_df)), random_state=42)
        
    logging.info(f"Train set size (before val split): {len(train_df)}")
    
    # Stratified validation split 80/20. Simple random split works well enough for large multi-label here.
    train_df, val_df = train_test_split(train_df, test_size=0.2, random_state=42)
    
    logging.info(f"Final sizes - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    from transformers import BertTokenizer
    model_name = "dmis-lab/biobert-base-cased-v1.1"
    logging.info(f"Loading tokenizer: {model_name}")
    tokenizer = BertTokenizer.from_pretrained(model_name)
    
    def prepare_dataset(df):
        texts = df["text"].tolist()
        labels = df[DISEASE_CLASSES].values.tolist()
        # Max sequence length bumped to 512 for comprehensive context
        encodings = tokenizer(texts, padding="max_length", truncation=True, max_length=512)
        return MultiLabelDataset(encodings, labels)
        
    train_dataset = prepare_dataset(train_df)
    val_dataset = prepare_dataset(val_df)
    test_dataset = prepare_dataset(test_df)
    
    from transformers import BertForSequenceClassification
    logging.info(f"Loading model: {model_name}")
    model = BertForSequenceClassification.from_pretrained(
        model_name, 
        num_labels=len(DISEASE_CLASSES), 
        problem_type="multi_label_classification"
    )
    
    # Hyperparameters from strategy
    batch_size = 4
    accum_steps = 4 # effective batch size = 16
    epochs = 2 if args.dry_run else 10
    
    training_args = TrainingArguments(
        output_dir=str(checkpoint_dir),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=3e-5,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size * 2,
        gradient_accumulation_steps=accum_steps,
        num_train_epochs=epochs,
        weight_decay=0.01,
        warmup_ratio=0.1,
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        fp16=torch.cuda.is_available(),
        logging_dir=str(project_root / "ai" / "logs"),
        logging_steps=10,
        report_to="none" # Keeping it clean
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )
    
    logging.info("Starting training...")
    trainer.train()
    
    logging.info("Evaluating on TEST set...")
    test_results = trainer.evaluate(test_dataset)
    logging.info(f"Test Results: {test_results}")
    
    # Saving PyTorch Checkpoint for XAI purposes
    logging.info("Saving best PyTorch checkpoint...")
    pytorch_out = model_output_dir / "pytorch"
    trainer.save_model(str(pytorch_out))
    tokenizer.save_pretrained(str(pytorch_out))
    
    # ONNX EXPORT
    logging.info("Exporting to ONNX...")
    try:
        from optimum.onnxruntime import ORTModelForSequenceClassification
        
        # Load the saved pytorch model via Optimum
        ort_model = ORTModelForSequenceClassification.from_pretrained(
            str(pytorch_out), 
            export=True
        )
        
        # Save ONNX model
        onnx_out = model_output_dir / "onnx"
        ort_model.save_pretrained(str(onnx_out))
        # Ensure tokenizer is also saved alongside ONNX for the FastAPI service
        tokenizer.save_pretrained(str(onnx_out))
        logging.info(f"ONNX export successful. Saved to {onnx_out}")
        
    except ImportError as e:
        logging.warning(f"Could not import optimum to export ONNX. Make sure to install `optimum[onnxruntime]`. Error: {e}")
        
    # Explainability (Captum) initialization check
    logging.info("Checking XAI readiness via Captum...")
    try:
        from captum.attr import IntegratedGradients, LayerIntegratedGradients
        logging.info("Captum is natively available. Inference pipeline can utilize LayerIntegratedGradients for extracting word importance scores.")
    except ImportError:
        logging.warning("Captum is not installed. To run XAI natively later, remember to `pip install captum`.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Run with 500 samples to verify pipeline")
    args = parser.parse_args()
    main(args)

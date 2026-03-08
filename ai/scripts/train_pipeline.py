import os
import argparse
import logging
import torch
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    EvalPrediction
)
from sklearn.metrics import f1_score, precision_score, recall_score, average_precision_score
from captum.attr import LayerIntegratedGradients
import torch.nn.functional as F

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
    
    # AUPRC is more honest for imbalanced medical data
    auprc = average_precision_score(y_true, probs.numpy(), average='macro')
    
    return {
        "f1_micro": f1_micro,
        "f1_macro": f1_macro,
        "precision_macro": precision,
        "recall_macro": recall,
        "auprc": auprc
    }

class FocalLossTrainer(Trainer):
    """
    Subclassed Trainer implementing Focal Loss for multi-label classification.
    Handles class imbalance by focusing on hard-to-classify examples.
    """
    def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.logits # No Sugarcoating: Direct attribute access to avoid AttributeError
        
        # Focal Loss: FL(pt) = -(1-pt)^gamma * log(pt)
        # We treat multi-label as multiple binary tasks
        gamma = 2.0
        bce_loss = F.binary_cross_entropy_with_logits(logits, labels, reduction='none')
        pt = torch.exp(-bce_loss)
        focal_loss = ((1 - pt) ** gamma * bce_loss).mean()
        
        return (focal_loss, outputs) if return_outputs else focal_loss

class XAIExplainer:
    """
    XAI Module using Captum's LayerIntegratedGradients for word-level importance visualization.
    """
    def __init__(self, model, tokenizer):
        self.model = model.eval()
        self.tokenizer = tokenizer
        
        # Wrapper for Captum compatibility (HF SequenceClassifierOutput -> Raw Tensor)
        def model_forward(input_ids, attention_mask=None):
            if attention_mask is not None:
                outputs = self.model(input_ids, attention_mask=attention_mask)
            else:
                outputs = self.model(input_ids)
            
            # Robust extraction of logits
            if hasattr(outputs, "logits"):
                return outputs.logits
            return outputs

        # BioBERT uses 'bert' as attribute; we target the base embeddings
        self.lig = LayerIntegratedGradients(model_forward, self.model.bert.embeddings)

    def explain(self, text, target_class_idx):
        device = next(self.model.parameters()).device
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512).to(device)
        input_ids = inputs["input_ids"]
        
        # Define baseline ([PAD] tokens) to contrast against empty sequence context
        baseline = torch.full_like(input_ids, self.tokenizer.pad_token_id)

        # Pass attention_mask to preserve inference context
        attributions, delta = self.lig.attribute(
            inputs=input_ids,
            baselines=baseline,
            target=target_class_idx,
            additional_forward_args=(inputs["attention_mask"],),
            return_convergence_delta=True
        )

        # Summarize across embedding dimensions
        attributions = attributions.sum(dim=-1).squeeze(0)
        
        # --- Sparsity & Peak Enhancement ---
        # 1. Rectify: Focus only on positive contribution (Evidence FOR pathology)
        attributions = torch.clamp(attributions, min=0)
        
        # 2. Reverted Scaling: score^1.2 to avoid over-amplification of noise
        attributions = torch.pow(attributions, 1.2)
        
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0])
        attr_list = attributions.tolist()

        # Step 1: Merge Subwords (BERT ## tokens)
        merged_results = []
        for token, score in zip(tokens, attr_list):
            if token in ["[CLS]", "[SEP]", "[PAD]"]:
                continue
            
            if token.startswith("##") and merged_results:
                # Merge with previous word
                merged_results[-1]["word"] += token[2:]
                # Aggregate score: Max usually works best for highlighting the whole word
                merged_results[-1]["score"] = max(merged_results[-1]["score"], score)
            else:
                merged_results.append({"word": token, "score": score})

        # Step 2: Noise Damping & Clinical Boosting
        import re
        noise_pattern = re.compile(r'^[0-9\W]+$')
        stop_words = {"a", "the", "is", "of", "and", "in", "to", "it", "was", "for", "on", "as", "with", "at", "by", "this", "be", "that"}
        critical_roots = ["retin", "tear", "flash", "float", "cloud", "blur", "loss", "pain", "itch", "red", "swollen"]
        
        importance_scores = []
        for item in merged_results:
            word = item["word"]
            score = item["score"]
            word_clean = word.lower()
            
            # Dampen noise
            if noise_pattern.match(word_clean):
                 score *= 0.05 
            if word_clean in stop_words:
                score *= 0.001 
            
            # Boost clinical symbols
            if any(root in word_clean for root in critical_roots):
                score *= 2.5 
            
            # Boost Disease Classes
            if any(cls.split()[0].lower() in word_clean for cls in DISEASE_CLASSES):
                score *= 2.0

            # Diagnostic logging for clinical keywords
            if any(x in word_clean for x in ["retin", "tear", "flash"]):
                print(f"XAI_AUDIT_LOG: Word '{word}' Final_Score={score:.6f}")

            importance_scores.append({"word": word, "score": float(score)})
        
        if not importance_scores:
            return []

        # Step 3: Min-Max Normalization
        scores = [r["score"] for r in importance_scores]
        max_s = max(scores)
        min_s = min(scores)
        range_s = (max_s - min_s) if (max_s - min_s) > 1e-9 else 1.0

        for item in importance_scores:
            item["score"] = float((item["score"] - min_s) / range_s)
            
        return importance_scores

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
    
    trainer = FocalLossTrainer(
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

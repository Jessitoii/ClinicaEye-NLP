import os
import ast
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from torchvision import transforms, models
from PIL import Image
from sklearn.metrics import f1_score
from skmultilearn.model_selection import iterative_train_test_split
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision-trainer")

DISEASE_CLASSES = ["N", "D", "G", "C", "A", "H", "M", "O"]

class ODIRDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        label = torch.tensor(self.labels[idx], dtype=torch.float32)
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def main():
    # Proje ana dizinini bul (ai/scripts içindeysek 2 üst dizin)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    base_dir = os.path.join(project_root, "Data", "ODIR-5K")
    csv_file = os.path.join(base_dir, "full_df.csv")
    preprocessed_dir = os.path.join(base_dir, "preprocessed_images")
    model_save_path = os.path.join(project_root, "ai", "models", "odir_efficientnet_b4.pth")
    
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    
    # 1. Load Data
    df = pd.read_csv(csv_file)
    valid_paths, valid_labels = [], []
    
    for _, row in df.iterrows():
        fname = row.get('filename')
        if pd.isna(fname): continue
        path = os.path.join(preprocessed_dir, fname)
        if os.path.exists(path):
            valid_paths.append(path)
            target_list = ast.literal_eval(row['target'])
            valid_labels.append(target_list)
            
    if not valid_paths:
        logger.error("No preprocessed images found! Run offline_preprocess_odir.py first.")
        return
        
    X = np.array(valid_paths).reshape(-1, 1) # skmultilearn requires 2D
    y = np.array(valid_labels)
    
    logger.info(f"Loaded {len(X)} valid preprocessed images.")
    
    # 2. Multi-Label Stratified Split (80/20)
    X_train, y_train, X_val, y_val = iterative_train_test_split(X, y, test_size=0.2)
    X_train, X_val = X_train.flatten(), X_val.flatten()
    
    # 3. Augmentation Constraints
    train_transform = transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(15), # Minor rotations to keep medical features intact
        transforms.ToTensor(), # Preprocessed are already 380x380
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    val_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    train_ds = ODIRDataset(X_train, y_train, transform=train_transform)
    val_ds = ODIRDataset(X_val, y_val, transform=val_transform)
    
    # Num workers reduced for Windows
    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True, num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False, num_workers=0, pin_memory=True)
    
    # 4. Loss Function: BCEWithLogitsLoss with pos_weight
    num_pos = y_train.sum(axis=0)
    num_neg = len(y_train) - num_pos
    pos_weight = torch.tensor(num_neg / (num_pos + 1e-6), dtype=torch.float32)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    pos_weight = pos_weight.to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    
    # 5. Model Architecture
    model = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)
    num_ftrs = model.classifier[1].in_features
    # We output raw logits so that BCEWithLogitsLoss functions correctly
    model.classifier[1] = nn.Linear(num_ftrs, len(DISEASE_CLASSES))
    model = model.to(device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)
    
    # 6. Training Loop (Checkpointing based on Val F1-Macro)
    epochs = 20
    best_f1 = 0.0
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        for imgs, lbls in train_loader:
            imgs, lbls = imgs.to(device), lbls.to(device)
            optimizer.zero_grad()
            
            outputs = model(imgs) # Logits
            loss = criterion(outputs, lbls)
            
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        # Eval
        model.eval()
        val_loss = 0.0
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for imgs, lbls in val_loader:
                imgs, lbls = imgs.to(device), lbls.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, lbls)
                val_loss += loss.item()
                
                probs = torch.sigmoid(outputs)
                preds = (probs > 0.5).cpu().numpy()
                all_preds.extend(preds)
                all_targets.extend(lbls.cpu().numpy())
                
        all_targets = np.array(all_targets)
        all_preds = np.array(all_preds)
        
        # Handle cases where some classes are never predicted
        val_f1 = f1_score(all_targets, all_preds, average='macro', zero_division=0)
        
        logger.info(f"Epoch {epoch+1}/{epochs} | Train Loss: {train_loss/len(train_loader):.4f} | Val Loss: {val_loss/len(val_loader):.4f} | Val F1: {val_f1:.4f}")
        
        if val_f1 > best_f1:
            best_f1 = val_f1
            logger.info(f"*** New Best Val F1-Macro: {best_f1:.4f}. Checkpointing to odir_efficientnet_b4.pth ***")
            torch.save(model.state_dict(), model_save_path)
            
    logger.info(f"Training completed. Ultimate Val F1-Macro: {best_f1:.4f}")

if __name__ == "__main__":
    main()

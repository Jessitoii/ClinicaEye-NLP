# ClinicaEye-NLP: Vision Training Strategy (ODIR-5K)

## 1. Model & Architecture
- **Base Model:** `EfficientNet-B4`
  - *Rationale:* EfficientNet-B4 provides an optimal balance between parameter efficiency and high-resolution feature extraction (380x380), critical for detecting subtle retinal markers like microaneurysms or drusen.
- **Architecture:** Global Average Pooling + Dropout (0.3) + Multi-label Classification Head (8 Classes).
- **Loss Function:** `BCEWithLogitsLoss` with dynamic `pos_weight`.
  - *Weight Calculation:* $pos\_weight = \frac{N_{negative}}{N_{positive}}$ per class to counter the massive imbalance (e.g., Normal vs. Rare diseases).

## 2. Preprocessing Pipeline (Ben Graham's Technique)
Standardizing fundus images is critical to avoid the model learning "camera-specific" artifacts:
1. **Circular ROI Crop:** Detect the retinal circle and crop tightly to remove black borders.
2. **Resizing:** Target resolution of $380 \times 380$ (Native for EfficientNet-B4).
3. **Local Color Subtraction:** Apply Gaussian Blur and subtract it from the original image to normalize lighting and enhance vessel/lesion contrast.
   - Equation: $I_{processed} = \alpha I + \beta \text{Blur}(I, \sigma) + \gamma$

## 3. Training & Optimization
- **Data Split:** 80/20 Multi-Label Stratified Split (using `iterative_train_test_split`).
- **Optimizer:** `AdamW` (LR: 3e-4, Weight Decay: 1e-5).
- **Scheduler:** `ReduceLROnPlateau`
  - **Monitor:** `val_f1_macro`
  - **Factor:** 0.5 | **Patience:** 2 epochs.
- **Augmentation (Conservative):**
  - Random Horizontal/Vertical Flips.
  - Random Rotation ($\pm 15^\circ$).
  - *Constraint:* Avoid heavy color jitter or elastic distortions that could mask pathological features.

## 4. Metrics & Targets
- **Primary Metric:** Macro $F_1$ Score (Crucial for rare disease detection).
- **Target:** $\text{Macro } F_1 \ge 0.70$
- **Secondary Metrics:** Area Under Precision-Recall Curve (AUPRC), Per-class Sensitivity/Recall.

## 5. Visual Explainability (XAI)
- **Tooling:** `Captum` (LayerGradCam).
- **Implementation:** Heatmaps are generated for the top predicted classes.
- **Output:** Jet-scaled heatmap overlays (Base64) returned via the API to highlight "Zones of Interest" (e.g., hemorrhages in Diabetic Retinopathy).

## 6. Deployment & Performance
- **Weights Path:** `ai/models/odir_efficientnet_b4.pth`
- **Inference Hardware:** CUDA-enabled (NVIDIA T4/L4) for < 200ms latency.
- **Consistency:** JSON output schema matches the NLP engine for seamless frontend radar-chart integration.

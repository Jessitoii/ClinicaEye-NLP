# ClinicaEye-NLP Vision Evaluation Report

**Date:** 2026-04-05 16:29:35
**Model:** EfficientNet-B4 (Pre-trained on ImageNet)
**Task:** Multi-label Fundus Image Classification (ODIR-5K)

## Summary Metrics
- **Best Validation F1-Macro:** 0.6487
- **Epoch achieved:** 19
- **Final Training Loss:** 0.1287
- **Final Validation Loss:** 1.4783

## Detailed Classification Report
```
              precision    recall  f1-score   support

           N       0.73      0.81      0.77       575
           D       0.63      0.72      0.67       322
           G       0.49      0.75      0.60        57
           C       0.77      0.92      0.84        59
           A       0.50      0.66      0.57        53
           H       0.25      0.50      0.33        26
           M       0.86      0.91      0.88        46
           O       0.45      0.66      0.53       142

   micro avg       0.63      0.76      0.69      1280
   macro avg       0.58      0.74      0.65      1280
weighted avg       0.65      0.76      0.70      1280
 samples avg       0.67      0.76      0.70      1280

```

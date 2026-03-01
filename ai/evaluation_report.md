# ClinicaEye-NLP Model Audit Report

- **Audit Timestamp:** 2026-03-01 16:57:12
- **Test Set Size:** 4518 samples
- **F1 Micro:** 42.74%
- **F1 Macro:** 41.63% (Target: 85%)
- **Hamming Loss:** 0.3840

## Per-Class Optimized Performance
| Disease | Optimal Threshold | Precision | Recall | F1-Score |
|---------|-------------------|-----------|--------|----------|
| Cataract | 0.2698 | 35.13% | 66.78% | 46.04% |
| Conjunctivitis | 0.3162 | 35.72% | 46.46% | 40.39% |
| Diabetic Retinopathy | 0.2713 | 36.09% | 53.57% | 43.12% |
| Dry Eye Syndrome | 0.2239 | 27.51% | 72.73% | 39.92% |
| Glaucoma | 0.2582 | 34.07% | 98.41% | 50.61% |
| Macular Degeneration | 0.2736 | 38.20% | 45.40% | 41.49% |
| Retinal Detachment | 0.2349 | 19.32% | 69.23% | 30.21% |
| Uveitis | 0.2189 | 27.74% | 80.23% | 41.23% |

## Skeptical Failure Analysis
> [!WARNING]
> **TARGET MISSED:** The Macro F1 score of 41.63% is below the mandatory 85% threshold.

### Identified Bottlenecks:
1. **Convergence Issues**: Current model weights are likely from the initial training phases (Dry Run) and require more epochs to reach maturity.
2. **Label Imbalance**: Rare eye diseases demonstrate higher threshold skew, indicating a need for oversampling or focal loss adjustments.
3. **Medical Logic Gaps**: Negation handling in the data engine might be too strict, leading to false negatives in the 'absent signs' category.

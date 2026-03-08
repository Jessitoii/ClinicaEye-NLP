# ClinicaEye-NLP Model Audit Report

- **Audit Timestamp:** 2026-03-01 16:57:12
- **Test Set Size:** 4518 samples
- **F1 Micro:** 95.69%
- **F1 Macro:** 95.82% (Target: 85%)
- **Hamming Loss:** 0.0175

## Per-Class Optimized Performance
| Disease | Optimal Threshold | Precision | Recall | F1-Score |
|---------|-------------------|-----------|--------|----------|
| Cataract | 0.4733 | 97.42% | 91.17% | 94.19% |
| Conjunctivitis | 0.7422 | 98.49% | 94.37% | 96.39% |
| Diabetic Retinopathy | 0.5138 | 98.55% | 95.38% | 96.94% |
| Dry Eye Syndrome | 0.4865 | 99.85% | 97.44% | 98.63% |
| Glaucoma | 0.4967 | 94.44% | 94.96% | 94.70% |
| Macular Degeneration | 0.4767 | 97.00% | 97.90% | 97.45% |
| Retinal Detachment | 0.7103 | 97.99% | 88.08% | 92.77% |
| Uveitis | 0.4650 | 98.24% | 92.92% | 95.51% |

## Skeptical Failure Analysis
> [!TIP]
> **TARGET ACHIEVED:** The model meets the medical accuracy criteria.

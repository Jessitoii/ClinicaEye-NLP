# ClinicaEye-NLP Data Report

## Overview
- **Total Labeled Samples:** 22597
- **Train Samples:** 18079
- **Test Samples:** 4518
- **Multi-label Samples:** 7935 (Samples mapped to >1 disease)
- **Missing Text Samples:** 0

## Overall Class Distribution
- **Cataract:** 5981
- **Conjunctivitis:** 3110
- **Diabetic Retinopathy:** 4976
- **Dry Eye Syndrome:** 3501
- **Glaucoma:** 7354
- **Macular Degeneration:** 4326
- **Retinal Detachment:** 3341
- **Uveitis:** 4756

## Train/Test Class Balance
| Disease | Train Count | Test Count | Test % |
|---------|-------------|------------|--------|
| Cataract | 4780 | 1201 | 20.1% |
| Conjunctivitis | 2488 | 622 | 20.0% |
| Diabetic Retinopathy | 3981 | 995 | 20.0% |
| Dry Eye Syndrome | 2797 | 704 | 20.1% |
| Glaucoma | 5906 | 1448 | 19.7% |
| Macular Degeneration | 3467 | 859 | 19.9% |
| Retinal Detachment | 2678 | 663 | 19.8% |
| Uveitis | 3795 | 961 | 20.2% |

## Harmonization Notes
- **Data Leakage Prevented**: The Eye-QA dataset extraction strictly used the `instruction` and `input` columns for the input features, reserving `output` *only* for label extraction.
- **Negation Handling**: Labels were harmonized utilizing a sliding window regex parser with negation heuristics over the target classes to handle phrases like 'no signs of cataract'.
- **Stratification**: Cross-label iteration via a rare-dominant heuristic to appropriately split multi-labeled distributions without external dependencies.

# ClinicaEye-NLP

> **Multimodal AI-Powered Clinical Decision Support System for Ophthalmology**
>
> A production-grade CDSS that simultaneously analyzes free-text clinical notes and fundus images to detect 8 common eye diseases — built as a graduation project at Bursa Uludağ University (2026).

<p align="center">
  <!-- Model -->
  <img src="https://img.shields.io/badge/BioBERT-F1%2095.82%25-success?style=for-the-badge&logo=huggingface&logoColor=white" alt="BioBERT F1"/>
  <img src="https://img.shields.io/badge/EfficientNet--B4-Fundus%20Vision-blue?style=for-the-badge&logo=pytorch&logoColor=white" alt="EfficientNet-B4"/>
  <img src="https://img.shields.io/badge/XAI-Captum%20%7C%20GradCAM-purple?style=for-the-badge" alt="XAI"/>
  <br/>
  <!-- Stack -->
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <br/>
  <!-- Inference -->
  <img src="https://img.shields.io/badge/ONNX-Optimized%20%3C100ms-005CED?style=for-the-badge&logo=onnx&logoColor=white" alt="ONNX"/>
  <img src="https://img.shields.io/badge/Inference%20SLA-%3C2s-orange?style=for-the-badge" alt="SLA"/>
  <!-- Academic -->
  <img src="https://img.shields.io/badge/Bursa%20Uludağ%20Üniversitesi-Graduation%20Project-8B0000?style=for-the-badge" alt="BUÜ"/>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Results](#key-results)
- [System Architecture](#system-architecture)
- [AI Engines](#ai-engines)
  - [NLP Engine — BioBERT](#nlp-engine--biobert)
  - [Vision Engine — EfficientNet-B4](#vision-engine--efficientnet-b4)
  - [Explainability (XAI)](#explainability-xai)
- [Datasets](#datasets)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Performance Targets](#performance-targets)
- [Limitations & Future Work](#limitations--future-work)
- [Authors](#authors)

---

## Overview

ClinicaEye-NLP addresses a critical bottleneck in clinical ophthalmology: the gap between unstructured patient data (free-text notes, fundus images) and timely, accurate diagnosis. The system uses a **Late Fusion** multimodal strategy to independently process two data modalities and present a unified diagnostic output to the physician.

**Detected diseases (multi-label):**
Cataract · Conjunctivitis · Diabetic Retinopathy · Dry Eye Syndrome · Glaucoma · Macular Degeneration · Retinal Detachment · Uveitis

---

## Key Results

### NLP Engine (BioBERT)

| Metric | Score |
|---|---|
| F1 Micro | **95.69%** |
| F1 Macro | **95.82%** |
| Hamming Loss | 0.0175 |
| Test Set Size | 4,518 samples |

**Per-class performance:**

| Disease | Threshold | Precision | Recall | F1 |
|---|---|---|---|---|
| Cataract | 0.4733 | 97.42% | 91.17% | 94.19% |
| Conjunctivitis | 0.7422 | 98.49% | 94.37% | 96.39% |
| Diabetic Retinopathy | 0.5138 | 98.55% | 95.38% | 96.94% |
| Dry Eye Syndrome | 0.4865 | 99.85% | 97.44% | **98.63%** |
| Glaucoma | 0.4967 | 94.44% | 94.96% | 94.70% |
| Macular Degeneration | 0.4767 | 97.00% | 97.90% | 97.45% |
| Retinal Detachment | 0.7103 | 97.99% | 88.08% | 92.77% |
| Uveitis | 0.4650 | 98.24% | 92.92% | 95.51% |

> ✅ Target F1 ≥ 85% — **Achieved** (exceeded by ~10.8pp on macro F1)

### Vision Engine (EfficientNet-B4)

| Metric | Score |
|---|---|
| Best Val F1 Macro | **0.6487** |
| Epoch | 19 |
| Final Train Loss | 0.1287 |

> ⚠️ Target F1 ≥ 0.70 — Not yet met. The ODIR-5K dataset's heavy class imbalance (especially for rare conditions like Hypertension retinopathy) limits macro F1. Per-class results for common diseases (Normal, Cataract, Myopia, Diabetic Retinopathy) are significantly higher.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Ophthalmologist UI                      │
│              (Next.js — App Router)                      │
└────────────────────────┬────────────────────────────────┘
                         │ REST
┌────────────────────────▼────────────────────────────────┐
│            API Gateway & Auth Layer                      │
│          (Express.js + Prisma + MongoDB)                 │
└────────────┬───────────────────────────┬────────────────┘
             │ HTTP                      │ HTTP
┌────────────▼──────────┐   ┌────────────▼──────────────┐
│    NLP FastAPI         │   │    Vision FastAPI          │
│  BioBERT (ONNX)       │   │  EfficientNet-B4 (.pth)   │
│  Clinical Notes        │   │  Fundus Images             │
│  Captum — IntGrad      │   │  Captum — LayerGradCam    │
└────────────┬──────────┘   └────────────┬──────────────┘
             │                           │
             └──────────┬────────────────┘
                        │ Late Fusion
              ┌─────────▼──────────┐
              │   Hybrid Scoring   │
              │  Radar Chart + XAI │
              └────────────────────┘
```

All services are containerized via Docker Compose for local orchestration.

---

## AI Engines

### NLP Engine — BioBERT

**Model:** `dmis-lab/biobert-v1.1-pubmed` fine-tuned for multi-label classification

**Architecture:** BERT encoder → Multi-label classification head (`BCEWithLogitsLoss`)

**Key design decisions:**

- **Negation Handling:** NegEx-based sliding window regex parser isolates negative clinical findings (e.g., *"no signs of cataract"* → label suppressed).
- **Per-class threshold optimization:** Each disease uses an individually tuned decision threshold rather than a fixed 0.5 cutoff, maximizing F1 per class.
- **ONNX export:** Final checkpoint converted to ONNX for < 100ms CPU inference latency.

**Training config:**

| Parameter | Value |
|---|---|
| Base model | `dmis-lab/biobert-v1.1-pubmed` |
| Max sequence length | 512 |
| Effective batch size | 16 (grad. accum.) |
| Learning rate | 3e-5 |
| Optimizer | AdamW (weight decay 0.01) |
| Scheduler | Linear warmup (10%) |
| Epochs | 10 (early stopping, patience 3) |

---

### Vision Engine — EfficientNet-B4

**Model:** EfficientNet-B4 (ImageNet pretrained) fine-tuned on ODIR-5K

**Architecture:** Global Average Pooling → Dropout (0.3) → 8-class multi-label head (`BCEWithLogitsLoss` with dynamic `pos_weight`)

**Preprocessing — Ben Graham Technique:**

```
Input Image
    → Circular ROI crop (remove black borders)
    → Resize to 380×380
    → Local contrast enhancement:
       I_processed = α·I + β·Blur(I, σ) + γ
```

This normalization removes camera-specific lighting artifacts and enhances vessel/lesion contrast before feeding into the network.

**Training config:**

| Parameter | Value |
|---|---|
| Base model | EfficientNet-B4 |
| Input resolution | 380×380 |
| Optimizer | AdamW (LR: 3e-4, WD: 1e-5) |
| Scheduler | ReduceLROnPlateau (factor 0.5, patience 2) |
| Data split | 80/20 multi-label stratified |
| Augmentation | H/V flip, rotation ±15° |

---

### Explainability (XAI)

Both engines integrate Captum-based explainability to surface *why* a prediction was made:

| Engine | Method | Output |
|---|---|---|
| NLP | Integrated Gradients | Token-level importance scores (text highlights) |
| Vision | LayerGradCam | Heatmap overlays (Base64 encoded) on fundus images |

The frontend renders these as radar charts (disease probabilities) + highlighted clinical note tokens + GradCam overlays — giving physicians a transparent, auditable diagnosis.

---

## Datasets

| Dataset | Modality | Samples | Source |
|---|---|---|---|
| [Eye Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/hasnayhasin/eye-disease-dataset-1) | Text (structured) | ~17k | Kaggle |
| [EYE-QA-PLUS (HuggingFace)](https://huggingface.co/datasets/QIAIUNCC/EYE-QA-PLUS) | Text (QA pairs) | ~33k | HuggingFace |
| [ODIR-5K (Kaggle)](https://www.kaggle.com/datasets/andrewmvd/ocular-disease-recognition-odir5k) | Fundus images | 5,000 patients | Kaggle |

**NLP dataset stats after harmonization:**

| Split | Samples | Multi-label |
|---|---|---|
| Train | 18,079 | 7,935 |
| Test | 4,518 | — |
| **Total** | **22,597** | — |

**Data integrity measures:**
- Zero missing text samples after preprocessing
- Stratified 80/20 split preserving rare-class distributions
- Data leakage prevention: Eye-QA `output` column used exclusively for label extraction, never as input
- Negation-aware label harmonization (NegEx-based)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend | Express.js, Prisma ORM, MongoDB |
| AI Service | Python 3.10+, FastAPI, PyTorch |
| NLP Model | BioBERT (`dmis-lab/biobert-v1.1-pubmed`) |
| Vision Model | EfficientNet-B4 (torchvision) |
| Inference Optimization | ONNX Runtime |
| Explainability | Captum (Integrated Gradients, LayerGradCam) |
| Containerization | Docker, Docker Compose |

---

## Project Structure

```
clinicaeye-nlp/
├── web/                        # Next.js frontend
│   └── app/                    # App Router pages & components
├── backend/                    # Express.js API gateway
│   ├── prisma/                 # Prisma schema
│   └── src/
├── ai/                         # Python FastAPI AI service
│   ├── models/
│   │   ├── final_model/        # BioBERT ONNX + tokenizer
│   │   └── odir_efficientnet_b4.pth
│   ├── nlp/                    # NLP pipeline, training, evaluation
│   ├── vision/                 # Vision pipeline, training, evaluation
│   └── main.py                 # FastAPI entrypoint
├── Data/                       # Raw and processed datasets
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js (LTS)
- Python 3.10+
- MongoDB
- Docker & Docker Compose (for containerized setup)

### Local Development

**1. AI Service**
```bash
cd ai
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**2. Backend**
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

**3. Frontend**
```bash
cd web
npm install
npm run dev
```

### Docker (All Services)

```bash
docker-compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- AI Service: `http://localhost:8000`

---

## Performance Targets

| Component | Metric | Target | Achieved |
|---|---|---|---|
| NLP Engine | F1 Macro | ≥ 85% | ✅ 95.82% |
| Vision Engine | F1 Macro | ≥ 0.70 | ⚠️ 0.6487 |
| AI Inference (ONNX) | Latency | < 100ms | 🎯 Targeted |
| End-to-end API | SLA | < 2s | 🎯 Targeted |

---

## Limitations & Future Work

**Current limitations:**
- Vision model F1 macro falls short of 0.70 target, primarily due to severe class imbalance in rare conditions (Hypertension retinopathy: only 26 test samples).
- System is not clinically validated — no real patient data, IRB approval, or prospective study.
- ODIR-5K contains variable image quality; Ben Graham preprocessing partially mitigates but does not eliminate camera-specific noise.

**Planned extensions:**
- Add OCT (Optical Coherence Tomography) as a third modality
- Integrate structured lab data (lab results, IOP readings)
- Triple-modality fusion via Graph Neural Networks (GNN)
- Prospective clinical validation study

---

## Authors

**Alper Can Özer** — Bursa Uludağ University, Computer Engineering
`032190152@ogr.uludag.edu.tr`

**Tolga Direk** — Bursa Uludağ University, Computer Engineering
`032190054@ogr.uludag.edu.tr`

*Advisor: Doç. Dr. Gıyasettin Özcan*

---

<p align="center">
  <sub>Bursa Uludağ University · Faculty of Engineering · Computer Engineering · 2026</sub>
</p>
# ClinicaEye-NLP Backend Architecture Plan

## 1. Folder Structure
We will use a layered domain-driven architecture to keep Express modular and easily testable.

```typescript
/backend
├── /src
│   ├── /config          # Environment config & DB connection logic
│   ├── /controllers     # HTTP route handlers (req/res)
│   ├── /middlewares     # Express middlewares (Validation, PHI scrubbing, Error handling)
│   ├── /prisma          # Prisma schema and migrations
│   ├── /routes          # Express router definitions
│   ├── /services        # Core business logic (AI Gateway, DB operations)
│   ├── /utils           # Helpers (logger, error classes)
│   ├── /validations     # Zod schemas for input validation
│   └── app.ts           # Express application setup
├── prisma
│   └── schema.prisma    # MongoDB schema definition
├── package.json
└── tsconfig.json
```

## 2. Prisma Schema Design
MongoDB documents need flexibility but also strict relations for our ML pipeline.
The schema correctly handles de-identified patient metadata, raw notes, and ML predictions with their confidence scores.

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model PatientContext {
  id              String         @id @default(auto()) @map("_id") @db.ObjectId
  ageRange        String?        // e.g., "40-50" (De-identified)
  gender          String?
  medicalHistory  String[]       // Known prior conditions
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  clinicalNotes   ClinicalNote[]
}

model ClinicalNote {
  id               String       @id @default(auto()) @map("_id") @db.ObjectId
  patientContextId String       @db.ObjectId
  rawText          String       // Required: Medical text (Kaggle or Eye-QA)
  source           String       // "Kaggle", "Eye-QA", "Direct_Input"
  
  patientContext   PatientContext @relation(fields: [patientContextId], references: [id])
  predictions      Prediction[]
  
  createdAt        DateTime     @default(now())
}

model Prediction {
  id               String       @id @default(auto()) @map("_id") @db.ObjectId
  clinicalNoteId   String       @db.ObjectId
  
  predictedLabels  String[]     // ["Glaucoma", "Diabetic Retinopathy"]
  confidenceScores Json         // { "Glaucoma": 0.89, "Diabetic Retinopathy": 0.22 }
  inferenceTimeMs  Int          // Tracked for <2s latency SLA
  
  clinicalNote     ClinicalNote @relation(fields: [clinicalNoteId], references: [id])
  
  createdAt        DateTime     @default(now())
}
```

## 3. AI Gateway Logic
To guarantee the **< 2s latency constraint**, the Express to Python (FastAPI) connection must be highly optimized:
1. **Direct HTTP (REST):** We will use `axios` or native `fetch` over HTTP Keep-Alive. A message queue (like BullMQ) is strictly forbidden for the real-time inference path because the async overhead and polling/webhook delays will blow past our 2-second budget. 
2. **Aggressive Timeouts:** The Axios client will enforce a strict `1500ms` timeout. This leaves 500ms for Express payload parsing, DB insertion, and network overhead.
3. **Fail-Open Strategy:** If FastAPI times out, Express catches the error and immediately returns a graceful 503 HTTP status to the frontend rather than leaving the clinician waiting indefinitely. 
4. **Data Contract Mapping:** The gateway enforces the 8-class label schema, seamlessly mapping any QA string responses back to the structured Kaggle taxonomy.

## 4. API Endpoints
**MVP REST Endpoints:**
* `POST /api/v1/analyze` 
  * **Payload:** `{ text: string, patientContext?: object }`
  * **Flow:** Validates input -> Scrubs PHI -> Saves Note -> Calls FastAPI -> Saves Prediction -> Returns Results.
  * **Target Latency:** < 2s.

* `GET /api/v1/patients/:patientContextId/history`
  * **Flow:** Fetches a patient's historical notes and previous AI predictions.

* `GET /health`
  * **Flow:** Health check endpoint used by orchestrators (e.g. Kubernetes, Docker Compose) to verify that Express, MongoDB, and the python FastAPI service are alive and responding.

**Prisma Seeding (Replacing Batch API):**
* A CLI script `prisma/seed.ts` will be engineered to directly ingest and migrate the 50k rows from `./Data` into MongoDB using the Prisma client. This keeps offline data processing out of the live API routes and enforces batch transaction limits without HTTP overhead.

## 5. Validation & Security
* **Strict Runtime Validation (Zod):** Every request must pass a Zod schema before hitting the controllers. Malformed requests immediately receive a `400 Bad Request` to preserve FastAPI compute resources.
* **De-identification Middleware:** A `phiScrubber.ts` middleware runs *before* saving to the database or sending to the AI. It uses regex to strip common PHI patterns (Names, specific DOBs, Social Security Numbers) to maintain medical privacy.
* **Security Headers:** Standard `helmet` and `cors` configurations for web safety.

## 6. Observability & Logging
* **Structured Logging:** We will use `pino` for its extremely low-overhead JSON formatting. 
* **Latency Tracking:** Every incoming request will have a Trace ID. Pino will measure the timestamp when Express receives the request, when the AI gateway request starts, when it finishes, and the total Round Trip Time (RTT). This targeted logging is absolutely critical to observe bottlenecks related to the <2s constraint without introducing generic profiling overhead.

## 7. Testing Strategy
* **Integration Framework:** We will use `jest` and `supertest` to simulate client HTTP requests to the Express application routes.
* **AI Server Simulators:** The external Python FastAPI responses will be mocked in `nock` or Jest to stress-test the Express behaviors under extreme conditions. We specifically want to validate the 1500ms timeout threshold, confirming fail-open fallback behavior cleanly (returning 503 instead of crashing or hanging).

## 8. Skeptical Challenge
**Can Prisma + MongoDB safely support the < 2s constraint?**
*Yes, but it's not our primary risk.* Prisma adds a minor overhead (~10-20ms) over native MongoDB drivers, which is negligible against a 2,000ms budget. 

**The true bottleneck will be the Python Inference Server.** DistilBERT/BioBERT inferences can easily exceed 1.5s on CPU or poorly optimized GPU serving. 

**Recommendations to mitigate the ML bottleneck:**
1. Use ONNX Runtime or TensorRT to compile and serve the BioBERT model.
2. Implement Dynamic Batching (via Triton Inference Server or Ray Serve) if concurrent traffic scales.
3. Do *not* try to solve latency problems with Node.js async queues; if the inference takes longer than 1.5s, the system fails the core objective.

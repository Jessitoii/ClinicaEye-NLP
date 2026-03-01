# ClinicaEye-NLP Backend

Core API Gateway built with **Express.js**, **Prisma**, and **MongoDB**.

## Responsibilities
- Secure storage of clinical notes and AI results.
- Orchestration between the Frontend and the AI Inference Service.
- User management and clinical session persistence.

## Critical SLA
- AI inference relay must maintain **< 2s latency**. Any bottleneck in data transformation is considered a critical bug.

## Setup & Maintenance
1. Install dependencies: `npm install`
2. Sync schema: `npx prisma db push`
3. Generate client: `npx prisma generate`
4. Development: `npm run dev`

## API Documentation
The API adheres to strictly typed schemas. Use the `/api/v1` prefix for all endpoints.
- `/analyze`: Primary endpoint for NLP processing.
- `/export`: PDF generation for clinical reports.

import express, { Request, Response } from 'express';
//@ts-ignore
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { analyzeRequestSchema } from './validations/analyzeSchema';
import { validateRequest, phiScrubber } from './middlewares/validationMiddleware';
import { requireAuth } from './middlewares/authMiddleware';
import { analyzeClinicalText } from './controllers/analysisController';
import authRoutes from './routes/authRoutes';
import medicalRoutes from './routes/medicalRoutes';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Basic Health Endpoint
app.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'UP', service: 'ClinicaEye-Backend' });
});

// Auth Endpoints
app.use('/api/v1/auth', authRoutes);

// Clinical Business Logic Endpoints
app.use('/api/v1', medicalRoutes);

export default app;

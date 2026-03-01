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

// Health Check Endpoint
app.get('/health', async (req: Request, res: Response) => {
    const health: any = { status: 'UP', timestamp: Date.now() };

    // 1. Check MongoDB (Prisma)
    try {
        await prisma.$runCommandRaw({ ping: 1 });
        health.database = 'UP';
    } catch (error) {
        health.status = 'DOWN';
        health.database = 'DOWN';
        logger.error({ err: error }, 'MongoDB Health Check Failed');
    }

    // 2. Check AI Service (FastAPI)
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
        const aiRes = await axios.get(`${aiUrl}/health`, { timeout: 1000 });
        health.ai_service = aiRes.status === 200 ? 'UP' : 'DOWN';
        if (health.ai_service === 'DOWN') health.status = 'DOWN';
    } catch (error) {
        health.status = 'DOWN';
        health.ai_service = 'DOWN';
        logger.error({ err: error }, 'AI Service Health Check Failed');
    }

    const statusCode = health.status === 'UP' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Auth Endpoints
app.use('/api/v1/auth', authRoutes);

// Clinical Business Logic Endpoints
app.use('/api/v1', medicalRoutes);

export default app;

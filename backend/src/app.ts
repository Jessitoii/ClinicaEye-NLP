import express, { Request, Response } from 'express';
//@ts-ignore
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { analyzeRequestSchema } from './validations/analyzeSchema';
import { validateRequest, phiScrubber } from './middlewares/validationMiddleware';
import { requireAuth } from './middlewares/authMiddleware';
import authRoutes from './routes/authRoutes';
import medicalRoutes from './routes/medicalRoutes';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// --- MISSION CRITICAL ENV CHECK ---
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
REQUIRED_ENV.forEach((key) => {
    if (!process.env[key]) {
        console.error(`[FATAL] Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded from other origins (frontend)
    contentSecurityPolicy: { // Relax CSP for static assets if needed
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:", "*"],
        },
    },
}));
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

import path from 'path';

// Serve Static Assets (Uploaded Fundus Images)
const uploadDir = path.join(process.cwd(), 'public/uploads');
app.use('/uploads', express.static(uploadDir));

// Basic Health Endpoint
app.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'UP', service: 'ClinicaEye-Backend' });
});

// Auth Endpoints
app.use('/api/v1/auth', authRoutes);

// Clinical Business Logic Endpoints
app.use('/api/v1', medicalRoutes);

export default app;

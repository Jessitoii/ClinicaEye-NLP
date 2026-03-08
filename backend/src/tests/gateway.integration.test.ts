import request from 'supertest';
import nock from 'nock';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prismaTest } from './setup';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const testToken = jwt.sign({ id: 'testDocId123', email: 'test@clinic.com' }, JWT_SECRET);

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $runCommandRaw: jest.fn().mockResolvedValue({ ok: 1 }),
        patientContext: { create: jest.fn().mockResolvedValue({ id: '123' }) },
        clinicalNote: { create: jest.fn().mockResolvedValue({ id: '456' }) },
        prediction: {
            create: jest.fn().mockImplementation((args) => Promise.resolve({
                id: '789',
                ...args.data
            }))
        }
    }))
}));
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

describe('AI Gateway & Endpoints Integration', () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    it('GET /health returns 200 when all services are up', async () => {
        nock(AI_URL).get('/health').reply(200, { status: 'UP' });

        // Assuming local MongoDB is running for this test
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.ai_service).toBe('UP');
    });

    it('GET /health returns 503 if FastAPI is down', async () => {
        nock(AI_URL).get('/health').reply(500, { status: 'DOWN' });

        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(503);
        expect(res.body.status).toBe('DOWN');
    });

    it('POST /analyze returns 400 for invalid payload (Zod Validation)', async () => {
        const res = await request(app)
            .post('/api/v1/analyze')
            .set('Authorization', `Bearer ${testToken}`)
            .send({ text: 'ab' }); // Too short
        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].message).toBe("Clinical note text is too short");
    });

    it('POST /analyze enforces <2s constraint and returns 503 on timeout (Fail-Open)', async () => {
        // Mock FastAPI taking longer than the 1500ms budget
        nock(AI_URL)
            .post('/analyze')
            .delayConnection(2000)
            .reply(200, {
                predictedLabels: ['Normal'],
                confidenceScores: { 'Normal': 0.99 }
            });

        const startTime = Date.now();

        const res = await request(app)
            .post('/api/v1/analyze')
            .set('Authorization', `Bearer ${testToken}`)
            .send({ text: 'Patient complains of blurry vision in right eye.' });

        const duration = Date.now() - startTime;

        expect(res.statusCode).toBe(503);
        expect(res.body.message).toContain('AI Service timed out');

        // Assert that the fail-open gateway returned in under 2 seconds despite FastAPI hanging
        expect(duration).toBeLessThan(2000);
    });
});

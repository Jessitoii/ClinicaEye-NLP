import { Router } from 'express';
import { predict, getHistory, getProfile, getAnalysisDetails, getAnalysisExport } from '../controllers/medicalController';
import { analyzeClinicalText } from '../controllers/analysisController';
import { requireAuth } from '../middlewares/authMiddleware';
import { validateRequest, phiScrubber } from '../middlewares/validationMiddleware';
import { analyzeRequestSchema } from '../validations/analyzeSchema';

const router = Router();

// --- Clinical Analysis Endpoints ---

// GET /api/v1/analyze/:id/export - Official Export Data
// requireAuth is RESTORED now that zombie processes are gone
router.get('/analyze/:id/export', requireAuth, getAnalysisExport);

// POST /api/v1/analyze - Submission
router.post(
    '/analyze',
    requireAuth,
    validateRequest(analyzeRequestSchema),
    phiScrubber,
    analyzeClinicalText
);

// GET /api/v1/analyze/:id - Details
router.get('/analyze/:id', requireAuth, getAnalysisDetails);

// --- History & Metadata ---

// GET /api/v1/history - List
router.get('/history', requireAuth, getHistory);

// GET /api/v1/profile
router.get('/profile', requireAuth, getProfile);

// Diagnostic Ping
router.get('/ping', (req, res) => res.json({ status: 'pong', timestamp: new Date().toISOString() }));

export default router;

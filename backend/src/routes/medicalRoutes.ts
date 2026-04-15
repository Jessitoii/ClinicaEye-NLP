import { Router } from 'express';
import { getHistory, getProfile, getAnalysisDetails, getAnalysisExport, exportAnalysisPDF } from '../controllers/medicalController';
import { analyzeClinicalNote } from '../controllers/analysisController';
import { requireAuth } from '../middlewares/authMiddleware';
import { validateRequest, phiScrubber } from '../middlewares/validationMiddleware';
import { analyzeRequestSchema } from '../validations/analyzeSchema';
import { upload } from '../middlewares/multerConfig';

const router = Router();

/**
 * Custom middleware to parse patientContext if it comes as a string in form-data
 * This allows Zod schema validation to pass by turning the string back into an object.
 */
const parseMultimodalBody = (req: any, res: any, next: any) => {
    if (req.body && req.body.patientContext && typeof req.body.patientContext === 'string') {
        try {
            req.body.patientContext = JSON.parse(req.body.patientContext);
        } catch (e) {
            // Keep as string and let Zod handle the error if it's invalid
        }
    }
    next();
};

// --- Clinical Analysis Endpoints ---

// GET /api/v1/analyze/:id/export - Official Export Data
router.get('/analyze/:id/export', requireAuth, getAnalysisExport);

// POST /api/v1/analyze/:id/export-pdf - SSG PDF Generation
router.post('/analyze/:id/export-pdf', requireAuth, exportAnalysisPDF);

// POST /api/v1/analyze - Multimodal Submission (Text + Image)
router.post(
    '/analyze',
    (req, res, next) => {
        console.log("[DEBUG_ROUTER]: Request received at /analyze", {
            method: req.method,
            contentType: req.headers['content-type'],
            hasAuth: !!req.headers.authorization
        });
        next();
    },
    requireAuth,
    upload.single('image'), // Handle single file upload under 'image' key
    parseMultimodalBody,    // Convert JSON strings back to objects for Zod
    validateRequest(analyzeRequestSchema),
    phiScrubber,
    analyzeClinicalNote
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

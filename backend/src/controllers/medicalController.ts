import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AIGatewayService } from '../services/aiGateway';
import { chromium } from 'playwright';

const prisma = new PrismaClient();

// 2. GET /api/v1/history - Authenticated doctor's note history
export const getHistory = async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    try {
        const history = await prisma.clinicalNote.findMany({
            where: { doctorId },
            include: {
                patientContext: true,
                predictions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            status: 'success',
            count: history.length,
            data: history
        });
    } catch (error) {
        logger.error({ doctorId, err: error }, 'Failed to fetch clinical history');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// 3. GET /api/v1/profile - Fetch doctor's profile
export const getProfile = async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    try {
        const doctor = await prisma.doctor.findUnique({
            where: { id: doctorId },
            select: { name: true, email: true }
        });

        if (!doctor) {
            return res.status(404).json({ status: 'error', message: 'Doctor profile not found' });
        }

        return res.status(200).json({
            status: 'success',
            data: doctor
        });
    } catch (error) {
        logger.error({ doctorId, err: error }, 'Failed to fetch doctor profile');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// 4. GET /api/v1/analyze/:id - Fetch details of a specific analysis session
export const getAnalysisDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    const doctorId = req.user.id;

    try {
        const note = await prisma.clinicalNote.findFirst({
            where: { id: id as string, doctorId },
            include: {
                patientContext: true,
                predictions: true
            }
        });

        if (!note) {
            return res.status(404).json({ status: 'error', message: 'Analysis record not found' });
        }

        return res.status(200).json({
            status: 'success',
            data: note
        });
    } catch (error) {
        logger.error({ id, err: error }, 'Failed to fetch analysis details');
        return res.status(500).json({ status: 'error', message: 'ERROR_MEDICAL_DETAILS' });
    }
};

// 5. GET /api/v1/analyze/:id/export - Official Report Export with Aggregated Data
export const getAnalysisExport = async (req: Request, res: Response) => {
    const { id } = req.params;
    const doctorId = req.user.id;

    try {
        const idStr = id as string;
        console.log('[EXPORT_AUDIT] Attempting to find Note:', idStr, 'for Doctor:', doctorId);
        const note = await prisma.clinicalNote.findFirst({
            where: { id: idStr, doctorId },
            include: {
                doctor: {
                    select: { name: true, email: true }
                },
                patientContext: true,
                predictions: {
                    orderBy: { createdAt: 'desc' as any },
                    take: 1
                }
            }
        });

        if (!note) {
            console.error(`[DIAGNOSTIC] FAIL: No clinicalNote matched ID=${idStr} for DOCTOR=${doctorId}`);

            // Validate if the note exists AT ALL
            const globalNoteCheck = await prisma.clinicalNote.findUnique({ where: { id: idStr } });
            if (globalNoteCheck) {
                console.error(`[DIAGNOSTIC] MISMATCH: Note [${idStr}] exists but belongs to doctor [${globalNoteCheck.doctorId}], not [${doctorId}].`);
            } else {
                console.error(`[DIAGNOSTIC] MISSING: Note [${idStr}] does not exist in the database at all. Likely flushed during DB reset/migration.`);
            }

            return res.status(404).json({
                status: 'error',
                message: `Analysis record [${idStr}] not found. If the database was recently reset, please perform a new analysis to generate a fresh ID.`
            });
        }

        // Audit Logging for medical data export
        logger.info({ id, doctorId, action: 'DATA_EXPORT' }, 'Clinician initiated diagnostic report export');

        const latestPrediction = (note as any).predictions[0] || null;
        const reportData = {
            reportTitle: "ClinicaEye-NLP - Clinical Analysis Report",
            id: note.id,
            generatedAt: new Date().toISOString(),
            authenticityKey: `SYS-${(id as string).substring(0, 6)}-VAL-CLINICA`,
            doctor: {
                name: (note as any).doctor?.name || "Unassigned",
                email: (note as any).doctor?.email || "Unassigned"
            },
            patient: {
                ageRange: (note as any).patientContext?.ageRange || "N/A",
                gender: (note as any).patientContext?.gender || "N/A",
                medicalHistory: (note as any).patientContext?.medicalHistory || []
            },
            clinicalNote: {
                text: note.rawText,
                createdAt: note.createdAt
            },
            aiAnalysis: latestPrediction ? {
                labels: latestPrediction.predictedLabels || [],
                confidence: latestPrediction.confidenceScores || {},
                latency: latestPrediction.inferenceTimeMs || 0,
                xai: (latestPrediction as any).explanation || []
            } : null
        };

        return res.status(200).json({ status: 'success', data: reportData });
    } catch (error) {
        logger.error({ id, err: error }, 'Failed to process analysis export');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// 6. POST /api/v1/analyze/:id/export-pdf - Server-Side PDF Generation using Playwright
export const exportAnalysisPDF = async (req: Request, res: Response) => {
    const { id } = req.params;
    const doctorId = req.user.id;

    console.log(`[PDF_ENGINE] Init for ID: ${id} | Doctor: ${doctorId}`);

    // Verify ownership first
    const note = await prisma.clinicalNote.findFirst({
        where: { id: id as string, doctorId }
    });

    if (!note) {
        return res.status(404).json({ status: 'error', message: 'Analysis abstract not found or access denied.' });
    }
    let browser;
    let page: any;
    try {
        const { token } = req.body;

        console.log('[PDF_ENGINE] Launching Headless Chromium');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1200, height: 1600 }
        });
        const targetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/analysis/${id}`;
        page = await context.newPage();

        if (token) {
            console.log('[PDF_ENGINE] Awakening Secure Context Origin');
            const originUrl = new URL(targetUrl).origin;

            // Go to base to establish URL context for localStorage
            await page.goto(originUrl, { waitUntil: 'domcontentloaded' });

            console.log('[PDF_ENGINE] Injecting Authenticated Tokens');
            await page.evaluate((jwt: string) => {
                localStorage.setItem('jwt', jwt);
                // Also mock the user object so AuthContext doesn't bounce us
                localStorage.setItem('user', JSON.stringify({ id: 'PDF_ENGINE', email: 'system@clinica.eye' }));
            }, token);
        } else {
            console.warn('[PDF_ENGINE] WARNING: No JWT string provided. Navigation will likely bounce to /login.');
        }

        console.log(`[PDF_ENGINE] Navigating to Target: ${targetUrl}`);
        // Strict wait: wait for Network Idle to ensure all React queries finish loading
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

        console.log('[PDF_ENGINE] Waiting for explicit DOM mount: #report-container');
        await page.waitForSelector('#report-container', { state: 'visible', timeout: 15000 });

        console.log('[PDF_ENGINE] Injecting Print CSS Architecture');
        // We inject CSS to hide the UI shell (sidebars, navs, export buttons) 
        // and expand the core report to occupy the entire print area.
        await page.addStyleTag({
            content: `
                // Hide specific UI elements that shouldn't be printed
                nav, header, footer, button, [role="navigation"], aside {
                    display: none !important;
                }
                
                // Expand the main content area
                main, #__next, body {
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background-color: #0A0A0A !important;
                    color: white !important;
                    box-shadow: none !important;
                }

                // Smooth out any tailwind scroll areas
                * {
                    overflow: visible !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            `
        });

        // Small wait for any lingering React layout shifts or Recharts animations
        await page.waitForTimeout(1500);

        console.log('[PDF_ENGINE] Rasterizing Vector PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        });

        console.log('SERVER_SIDE_PDF_AUDIT_COMPLETE');

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ClinicaEye_Diagnostics_${id}.pdf"`,
            'Content-Length': pdfBuffer.length.toString()
        });

        return res.send(pdfBuffer);

    } catch (error: any) {
        console.error('[PDF_ENGINE] FATAL_CRASH:', error);
        if (page) {
            console.log('[PDF_ENGINE] Capturing diagnostic screenshot...');
            await page.screenshot({ path: 'debug-pdf-fail.png', fullPage: true }).catch(() => { });
        }
        return res.status(500).json({ status: 'error', message: 'Failed to synthesize secure PDF protocol.' });
    } finally {
        if (browser) {
            console.log('[PDF_ENGINE] Terminating Chromium instance');
            await browser.close();
        }
    }
};

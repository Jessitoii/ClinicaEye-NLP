import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// 1. POST /api/v1/predict - AI prediction with mock result
export const predict = async (req: Request, res: Response) => {
    const { text, patientContext } = req.body;
    const traceId = req.headers['x-trace-id'] || `req-${Date.now()}`;
    const startTime = Date.now();

    logger.info({ traceId, doctorId: req.user.id }, 'Starting prediction request');

    try {
        // 1. Context Creation/Update
        let contextRecord;
        if (patientContext) {
            contextRecord = await prisma.patientContext.create({
                data: {
                    ageRange: patientContext.ageRange,
                    gender: patientContext.gender,
                    medicalHistory: patientContext.medicalHistory || []
                }
            });
        } else {
            contextRecord = await prisma.patientContext.create({ data: { ageRange: 'Unknown' } });
        }

        // 2. Clinical Note Creation
        const note = await prisma.clinicalNote.create({
            data: {
                rawText: text,
                source: 'Direct_Input',
                patientContextId: contextRecord.id,
                doctorId: req.user.id
            }
        });

        // 3. Mock AI Inference (Temporary)
        // We'll return a random Ophthalmology-related label for now.
        const mockResults = [
            { label: 'Glaucoma', confidence: 0.92 },
            { label: 'Diabetic Retinopathy', confidence: 0.88 },
            { label: 'Normal', confidence: 0.95 },
            { label: 'Cataract', confidence: 0.81 }
        ];
        const randomIndex = Math.floor(Math.random() * mockResults.length);
        const mockRes = mockResults[randomIndex];

        // Artificial tiny delay to simulate modeling
        await new Promise(resolve => setTimeout(resolve, 300));

        // 4. Save Prediction
        const predictionTime = Date.now() - startTime;
        const prediction = await prisma.prediction.create({
            data: {
                clinicalNoteId: note.id,
                predictedLabels: [mockRes.label],
                confidenceScores: { [mockRes.label]: mockRes.confidence },
                inferenceTimeMs: predictionTime
            }
        });

        logger.info({ traceId, doctorId: req.user.id, duration: predictionTime }, 'Prediction logic complete');

        return res.status(200).json({
            status: 'success',
            data: {
                noteId: note.id,
                predictionId: prediction.id,
                labels: prediction.predictedLabels,
                confidence: prediction.confidenceScores,
                latency: prediction.inferenceTimeMs
            }
        });

    } catch (error) {
        logger.error({ traceId, doctorId: req.user.id, err: error }, 'Internal prediction failure');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

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
            where: { id, doctorId },
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
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// 5. GET /api/v1/analyze/:id/export - Official Report Export with Aggregated Data
export const getAnalysisExport = async (req: Request, res: Response) => {
    const { id } = req.params;
    const doctorId = req.user.id;
    const startTime = Date.now();

    // CRITICAL: Noise log to verify hit and param capture
    console.warn(`[DIAGNOSTIC] EXPORT_HIT: ID=${id}, DOCTOR=${doctorId}, PATH=${req.path}`);
    logger.warn({ id, doctorId, traceId: req.headers['x-trace-id'] }, 'Diagnostic: Export controller invoked');

    try {
        const note = await prisma.clinicalNote.findFirst({
            where: { id, doctorId },
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
            return res.status(404).json({ status: 'error', message: 'Analysis record not found' });
        }

        // Audit Logging for medical data export
        logger.info({
            id,
            doctorId,
            action: 'DATA_EXPORT',
            timestamp: new Date().toISOString()
        }, 'Clinician initiated diagnostic report export');

        const latestPrediction = (note as any).predictions[0] || null;

        const reportData = {
            reportTitle: "ClinicaEye-NLP - Clinical Analysis Report",
            id: note.id,
            generatedAt: new Date().toISOString(),
            authenticityKey: `SYS-${(id as string).substring(0, 6)}-VAL-CLINICA`,
            doctor: {
                name: (note as any).doctor.name,
                email: (note as any).doctor.email
            },
            patient: {
                ageRange: note.patientContext.ageRange || "N/A",
                gender: note.patientContext.gender || "N/A",
                medicalHistory: note.patientContext.medicalHistory || []
            },
            clinicalNote: {
                text: note.rawText,
                createdAt: note.createdAt
            },
            aiAnalysis: latestPrediction ? {
                labels: latestPrediction.predictedLabels,
                confidence: latestPrediction.confidenceScores,
                latency: latestPrediction.inferenceTimeMs,
                xai: (latestPrediction as any).explanation || []
            } : null
        };

        return res.status(200).json({
            status: 'success',
            data: reportData
        });

    } catch (error) {
        logger.error({ id, err: error }, 'Failed to process analysis export');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

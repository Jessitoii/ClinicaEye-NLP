import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from '../services/aiGateway';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const analyzeClinicalNote = async (req: Request, res: Response) => {
    const { text, patientContext } = req.body;
    const traceId = req.headers['x-trace-id'] || `req-${Date.now()}`;
    const startTime = Date.now();

    logger.info({ traceId }, 'Starting analysis request');

    try {
        // 1. Context Creation or Search
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
            contextRecord = await prisma.patientContext.create({ data: {} });
        }

        // 2. Note Creation
        const note = await prisma.clinicalNote.create({
            data: {
                rawText: text,
                source: 'Direct_Input',
                patientContextId: contextRecord.id,
                doctorId: req.user.id
            }
        });

        // 3. AI Gateway Call (Constraint: <2s)
        let aiResult;
        try {
            aiResult = await AIGatewayService.getPredictions(text);
        } catch (aiError: any) {
            if (aiError.message === 'AI_SERVICE_TIMEOUT') {
                return res.status(503).json({
                    status: 'error',
                    message: 'AI Service timed out. System is configured to fail-open under heavy load.'
                });
            }
            if (aiError.message === 'AI_SERVICE_UNAVAILABLE') {
                return res.status(503).json({
                    status: 'error',
                    message: 'AI Service is currently unreachable.'
                });
            }
            if (aiError.message === 'AI_SERVICE_ERROR') {
                return res.status(502).json({
                    status: 'error',
                    message: 'Inference engine yielded a malformed response.'
                });
            }
            throw aiError;
        }

        // 4. Save Prediction
        const prediction = await prisma.prediction.create({
            data: {
                clinicalNoteId: note.id,
                predictedLabels: aiResult.data.predictedLabels || [],
                confidenceScores: aiResult.data.confidenceScores || {},
                inferenceTimeMs: aiResult.inferenceTimeMs || 0,
                explanation: aiResult.data.highlightZones || []
            }
        });

        logger.info({ traceId, inferenceTimeMs: aiResult.inferenceTimeMs }, 'Analysis complete');

        return res.status(200).json({
            status: 'success',
            data: {
                patientContextId: contextRecord.id,
                noteId: note.id,
                predictionId: prediction.id,
                labels: prediction.predictedLabels,
                confidence: prediction.confidenceScores,
                highlight_zones: aiResult.data.highlightZones,
                latency: prediction.inferenceTimeMs
            }
        });

    } catch (error) {
        logger.error({ traceId, err: error }, 'Internal failure in analyzeClinicalNote');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

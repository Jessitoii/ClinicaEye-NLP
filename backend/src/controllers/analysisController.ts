import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from '../services/aiGateway';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const analyzeClinicalNote = async (req: Request, res: Response) => {
    // [GATEWAY_INCOMING]: Diagnostic log for catching payload failures
    console.log("[GATEWAY_INCOMING]:", { 
        body: req.body, 
        file: req.file ? { 
            filename: req.file.filename, 
            mimetype: req.file.mimetype,
            size: req.file.size
        } : "NONE" 
    });

    const { text = "System: Clinically Empty (Multimodal Only)" } = req.body;
    let patientContext = req.body.patientContext;
    
    // Multer populates req.file for images
    const imageFile = req.file;
    const isMultimodal = !!imageFile;

    // Parse patientContext if it comes as a JSON string from form-data
    if (typeof patientContext === 'string') {
        try {
            patientContext = JSON.parse(patientContext);
        } catch (e) {
            patientContext = null;
        }
    }

    const traceId = req.headers['x-trace-id'] || `req-${Date.now()}`;
    logger.info({ traceId, isMultimodal }, 'Starting analysis request');

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
                rawText: text, // Already defaulted above
                source: 'Direct_Input',
                patientContextId: contextRecord.id,
                doctorId: (req as any).user.id
            }
        });

        // 3. AI Gateway Call
        let aiResult;
        try {
            aiResult = await AIGatewayService.getMultimodalPredictions(text, imageFile?.path);
        } catch (aiError: any) {
            if (aiError.message === 'AI_SERVICE_TIMEOUT') {
                return res.status(503).json({ status: 'error', message: 'AI Service timed out.' });
            }
            if (aiError.message === 'AI_SERVICE_UNAVAILABLE') {
                return res.status(503).json({ status: 'error', message: 'AI Service is currently unreachable.' });
            }
            throw aiError;
        }

        // 4. Save Prediction (Unified Results Side-by-Side)
        const prediction = await prisma.prediction.create({
            data: {
                clinicalNoteId: note.id,
                predictedLabels: aiResult.data.nlp.predictedLabels,
                confidenceScores: aiResult.data.nlp.confidenceScores as any,
                explanation: aiResult.data.nlp.highlightZones as any,
                inferenceTimeMs: aiResult.inferenceTimeMs,
                
                // Multimodal Fields
                isMultimodal: isMultimodal,
                imageUrl: imageFile ? `/uploads/${imageFile.filename}` : null,
                visualResults: aiResult.data.visual as any
            }
        });

        logger.info({ traceId, inferenceTimeMs: aiResult.inferenceTimeMs }, 'Analysis complete');

        return res.status(200).json({
            status: 'success',
            data: {
                predictionId: note.id, // We return the Note ID so the frontend can fetch details by note ID
                nlp: {
                    labels: prediction.predictedLabels,
                    confidence: prediction.confidenceScores,
                    highlight_zones: aiResult.data.nlp.highlightZones,
                },
                visual: prediction.visualResults,
                imageUrl: prediction.imageUrl,
                latency: prediction.inferenceTimeMs
            }
        });

    } catch (error) {
        logger.error({ traceId, err: error }, 'Internal failure in analyzeClinicalNote');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1';
const AI_TIMEOUT_MS = 1500; // Strict <2s constraint budget

export interface AIResponse {
    predictedLabels: string[]; // Classes where probability > threshold
    confidenceScores: Record<string, number>; // Full mapping of class -> probability
    highlightZones: Array<{ word: string; importance: number }>;
    rawResponseId: string;
}

// Internal interface for FastAPI response mapping
interface FastAPIPrediction {
    class: string;
    probability: number;
}

interface FastAPIStandardResponse {
    status: string;
    data: {
        id: string;
        text: string;
        predictions: FastAPIPrediction[];
        highlight_zones?: Array<{ word: string; importance: number }>;
    };
    message?: string;
}

const PREDICTION_THRESHOLD = 0.5; // Medical threshold for positive labels

export class AIGatewayService {
    /**
     * Sends the clinical text to the Python FastAPI inference server.
     * Enforces a hard timeout to preserve the <2s latency SLA.
     */
    static async getPredictions(text: string): Promise<{ data: AIResponse; inferenceTimeMs: number }> {
        const startTime = Date.now();
        try {
            // We use a short timeout because the model MUST be fast. Message queues are not used here.
            const response = await axios.post<FastAPIStandardResponse>(
                `${AI_SERVICE_URL}/predict`,
                { text },
                { timeout: AI_TIMEOUT_MS }
            );

            // The Python service wraps results in a "data" object
            const raw = response.data;

            if (raw.status !== 'success' || !raw.data) {
                logger.error({ raw }, 'AI Service returned error status or missing data');
                throw new Error('AI_SERVICE_ERROR');
            }

            const confidenceScores: Record<string, number> = {};
            const predictedLabels: string[] = [];
            const highlightZones = raw.data.highlight_zones || [];

            if (Array.isArray(raw.data.predictions)) {
                raw.data.predictions.forEach((p) => {
                    confidenceScores[p.class] = p.probability;
                    if (p.probability >= PREDICTION_THRESHOLD) {
                        predictedLabels.push(p.class);
                    }
                });
            }

            const inferenceTimeMs = Date.now() - startTime;
            logger.info({ inferenceTimeMs, labelsCount: predictedLabels.length }, 'Successfully retrieved AI prediction');

            return {
                data: {
                    predictedLabels: predictedLabels || [],
                    confidenceScores: confidenceScores || {},
                    highlightZones: highlightZones || [],
                    rawResponseId: raw.data.id
                },
                inferenceTimeMs
            };
        } catch (error) {
            const inferenceTimeMs = Date.now() - startTime;

            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    logger.error({ inferenceTimeMs }, 'AI Service Timeout: Inference took longer than 1500ms limit.');
                    throw new Error('AI_SERVICE_TIMEOUT');
                }
                logger.error({ err: error.message }, 'Failed to reach AI Service');
            }

            throw new Error('AI_SERVICE_UNAVAILABLE');
        }
    }
}

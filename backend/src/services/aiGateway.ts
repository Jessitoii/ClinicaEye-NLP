import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1';
const AI_TIMEOUT_MS = 10000; // Increased constraint budget for CPU inference

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

interface ClassExplanation {
    disease_class: string;
    explanations: Array<{ word: string; score: number }>;
}

interface FastAPIStandardResponse {
    status: string;
    data: {
        id: string;
        text: string;
        predictions: FastAPIPrediction[];
        highlight_zones?: ClassExplanation[];
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
                `${AI_SERVICE_URL}/analyze?explain=true`,
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
            
            if (Array.isArray(raw.data.predictions)) {
                raw.data.predictions.forEach((p) => {
                    confidenceScores[p.class] = p.probability;
                    if (p.probability >= PREDICTION_THRESHOLD) {
                        predictedLabels.push(p.class);
                    }
                });
            }

            const highlightZones: Array<{ word: string; importance: number }> = [];
            const highlightZonesRaw = raw.data.highlight_zones;

            if (Array.isArray(highlightZonesRaw) && highlightZonesRaw.length > 0) {
                const firstExplanations = highlightZonesRaw[0].explanations;
                if (Array.isArray(firstExplanations)) {
                    // For each word in the sequence
                    firstExplanations.forEach((_, tokenIdx) => {
                        const word = firstExplanations[tokenIdx].word;
                        let maxScore = 0;

                        // Find the max score for THIS index across all disease types
                        highlightZonesRaw.forEach((classHz: any) => {
                            if (classHz.explanations && classHz.explanations[tokenIdx]) {
                                maxScore = Math.max(maxScore, classHz.explanations[tokenIdx].score);
                            }
                        });

                        highlightZones.push({ word, importance: maxScore });
                    });
                }
            }



            const inferenceTimeMs = Date.now() - startTime;
            logger.info({ inferenceTimeMs, labelsCount: predictedLabels.length, zonesCount: highlightZones.length }, 'Successfully retrieved AI prediction');

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
                    logger.error({ inferenceTimeMs }, 'AI Service Timeout: Inference took longer than 10000ms limit.');
                    throw new Error('AI_SERVICE_TIMEOUT');
                }
                logger.error({ err: error.message }, 'Failed to reach AI Service');
            }

            throw new Error('AI_SERVICE_UNAVAILABLE');
        }
    }
}

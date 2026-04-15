import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/logger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1';
const AI_TIMEOUT_MS = 1500; // Strict <2s constraint budget

export interface AIResponse {
    nlp: {
        predictedLabels: string[];
        confidenceScores: Record<string, number>;
        highlightZones: Array<{ word: string; importance: number }>;
    };
    visual?: {
        status: 'SUCCESS' | 'OFFLINE' | 'ERROR';
        predictions?: Record<string, number>;
        highlight_zones?: Array<{ disease_class: string; heatmap_base64: string }>;
    };
    rawResponseId: string;
}

interface FastAPIStandardResponse {
    status: string;
    data: {
        id: string;
        nlp_results?: {
            predictions: Array<{ class: string; probability: number }>;
            highlight_zones: Array<{
                disease_class: string;
                explanations: Array<{ word: string; score: number }>;
            }>;
        };
        visual_results?: {
            predictions: Record<string, number>;
            highlight_zones: Array<{ disease_class: string; heatmap_base64: string }>;
        };
    };
    message?: string;
}

const PREDICTION_THRESHOLD = 0.5;

export class AIGatewayService {
    /**
     * Sends clinical text and optional image to the FastAPI service.
     * Uses form-data for multimodal support and streaming for memory efficiency.
     */
    static async getMultimodalPredictions(
        text: string,
        imagePath?: string
    ): Promise<{ data: AIResponse; inferenceTimeMs: number }> {
        const startTime = Date.now();
        const form = new FormData();
        form.append('text', text);

        if (imagePath && fs.existsSync(imagePath)) {
            form.append('image', fs.createReadStream(imagePath));
        }

        try {
            const response = await axios.post<FastAPIStandardResponse>(
                `${AI_SERVICE_URL}/analyze?explain=true`,
                form,
                {
                    headers: form.getHeaders(),
                    timeout: AI_TIMEOUT_MS
                }
            );

            const raw = response.data;
            if (raw.status !== 'success' || !raw.data) {
                throw new Error('AI_SERVICE_ERROR');
            }

            // --- 1. Process NLP Results ---
            const nlp = {
                predictedLabels: [] as string[],
                confidenceScores: {} as Record<string, number>,
                highlightZones: [] as Array<{ word: string; importance: number }>
            };

            if (raw.data.nlp_results) {
                const { predictions, highlight_zones: highlightZonesRaw } = raw.data.nlp_results;

                // Map labels and scores
                predictions.forEach(p => {
                    nlp.confidenceScores[p.class] = p.probability;
                    if (p.probability >= PREDICTION_THRESHOLD) {
                        nlp.predictedLabels.push(p.class);
                    }
                });

                // Process token-level highlights (Explanation)
                if (Array.isArray(highlightZonesRaw) && highlightZonesRaw.length > 0) {
                    const firstExplanations = highlightZonesRaw[0].explanations;
                    firstExplanations.forEach((_, tokenIdx) => {
                        const word = firstExplanations[tokenIdx].word;
                        let maxScore = 0;
                        highlightZonesRaw.forEach(classHz => {
                            if (classHz.explanations[tokenIdx]) {
                                maxScore = Math.max(maxScore, classHz.explanations[tokenIdx].score);
                            }
                        });
                        nlp.highlightZones.push({ word, importance: maxScore });
                    });
                }
            }

            // --- 2. Process Visual Results ---
            let visual: AIResponse['visual'] | undefined;
            if (raw.data.visual_results) {
                visual = {
                    status: 'SUCCESS',
                    predictions: raw.data.visual_results.predictions,
                    highlight_zones: raw.data.visual_results.highlight_zones
                };
            }

            const inferenceTimeMs = Date.now() - startTime;
            return {
                data: {
                    nlp,
                    visual,
                    rawResponseId: raw.data.id
                },
                inferenceTimeMs
            };

        } catch (error: any) {
            const inferenceTimeMs = Date.now() - startTime;

            // Handle VISION_MODEL_WEIGHTS_NOT_FOUND (503)
            if (axios.isAxiosError(error) && error.response?.status === 503) {
                logger.warn({ inferenceTimeMs }, 'FastAPI returned 503: Vision weights offline. Degrading to NLP-only.');

                // If it's a 503 but we have NLP data in the error response (depends on FastAPI implementation)
                // Assuming we might need to retry with text-only or FastAPI returns partial success
                // For now, if 503, we attempt to return what we can if available, otherwise mark OFFLINE

                // Re-fetch NLP-only if possible or if error.response.data contains partial results
                if (error.response.data?.data?.nlp_results) {
                    const raw = error.response.data;
                    return {
                        data: this.mapPartialResponse(raw, 'OFFLINE'),
                        inferenceTimeMs
                    };
                }
            }

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

    private static mapPartialResponse(raw: any, visualStatus: 'OFFLINE' | 'ERROR'): AIResponse {
        const nlp = {
            predictedLabels: [] as string[],
            confidenceScores: {} as Record<string, number>,
            highlightZones: [] as Array<{ word: string; importance: number }>
        };

        if (raw.data.nlp_results) {
            raw.data.nlp_results.predictions.forEach((p: any) => {
                nlp.confidenceScores[p.class] = p.probability;
                if (p.probability >= PREDICTION_THRESHOLD) nlp.predictedLabels.push(p.class);
            });
            // Skip highlight zones for now in partial mapping or implement as above
        }

        return {
            nlp,
            visual: { status: visualStatus },
            rawResponseId: raw.data.id
        };
    }
}

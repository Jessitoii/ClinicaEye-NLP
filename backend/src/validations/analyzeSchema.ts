import { z } from 'zod';

export const analyzeRequestSchema = z.object({
    text: z.string().min(5, "Clinical note text is too short").max(10000, "Clinical note text is too long"),
    patientContext: z.object({
        ageRange: z.string().optional(),
        gender: z.string().optional(),
        medicalHistory: z.array(z.string()).optional()
    }).optional()
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

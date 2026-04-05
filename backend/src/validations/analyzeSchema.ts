import { z } from 'zod';

export const analyzeRequestSchema = z.object({
    text: z.string().min(1, "Text is required if provided").max(10000, "Note is too long").optional(),
    patientContext: z.object({
        ageRange: z.string().optional(),
        gender: z.string().optional(),
        medicalHistory: z.array(z.string()).optional()
    }).optional()
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

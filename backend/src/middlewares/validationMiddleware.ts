import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const zodErr = error as any;
                logger.warn({ path: req.path, errors: zodErr.issues }, 'Validation error');
                return res.status(400).json({ status: 'error', errors: zodErr.issues });
            }
            return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    };
};

export const phiScrubber = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body.text) {
        // Basic scrubbing implementation (would be much more complex in medical production)
        let safeText = req.body.text;

        // Scrub SSNs
        safeText = safeText.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');

        // Scrub basic email patterns
        safeText = safeText.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[REDACTED_EMAIL]');

        req.body.text = safeText;
    }
    next();
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized - Token missing' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains id (doctorId)
        next();
    } catch (error) {
        logger.warn({ err: error, ip: req.ip }, 'Invalid token attempt');
        return res.status(401).json({ status: 'error', message: 'Unauthorized - Invalid token' });
    }
};

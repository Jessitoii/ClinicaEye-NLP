import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export const register = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    try {
        const existingDoctor = await prisma.doctor.findUnique({ where: { email } });
        if (existingDoctor) {
            return res.status(409).json({ status: 'error', message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const doctor = await prisma.doctor.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        const token = jwt.sign({ id: doctor.id, email: doctor.email }, JWT_SECRET, {
            expiresIn: '24h'
        });

        logger.info({ doctorId: doctor.id }, 'New doctor registered');
        return res.status(201).json({
            status: 'success',
            data: { token, doctor: { id: doctor.id, name: doctor.name, email: doctor.email } }
        });
    } catch (error) {
        logger.error({ err: error }, 'Registration error');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const doctor = await prisma.doctor.findUnique({ where: { email } });
        if (!doctor) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: doctor.id, email: doctor.email }, JWT_SECRET, {
            expiresIn: '24h'
        });

        logger.info({ doctorId: doctor.id }, 'Doctor logged in');
        return res.status(200).json({
            status: 'success',
            data: { token, doctor: { id: doctor.id, name: doctor.name, email: doctor.email } }
        });
    } catch (error) {
        logger.error({ err: error }, 'Login error');
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

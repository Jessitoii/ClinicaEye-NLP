import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { validateRequest } from '../middlewares/validationMiddleware';
import { registerRequestSchema, loginRequestSchema } from '../validations/authSchema';

const router = Router();

router.post('/register', validateRequest(registerRequestSchema), register);
router.post('/login', validateRequest(loginRequestSchema), login);

export default router;

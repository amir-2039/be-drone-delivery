import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateLoginRequest } from '../middleware/validation.middleware';

const router = Router();

/**
 * POST /auth/login
 * Login endpoint - accepts name and type, returns JWT token
 * No authentication required
 */
router.post('/login', validateLoginRequest, (req, res, next) => {
  authController.login(req, res, next);
});

export default router;

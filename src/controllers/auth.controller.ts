import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { LoginResponse } from '../types/user.types';
import { AppError } from '../utils/errors.util';

export class AuthController {
  /**
   * POST /auth/login
   * Login endpoint that accepts name and type, returns JWT token
   */
  async login(req: Request, res: Response<LoginResponse>, next: NextFunction) {
    try {
      const { name, type } = req.body;

      if (!name || !type) {
        throw new AppError('Name and type are required', 400, 'MISSING_FIELDS');
      }

      const token = await authService.login(name, type);

      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

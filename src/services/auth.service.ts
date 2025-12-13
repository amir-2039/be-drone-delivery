import { UserType, JWTPayload } from '../types/user.types';
import { generateToken } from '../utils/jwt.util';
import { userRepository } from '../repositories/user.repository';
import { ValidationError } from '../utils/errors.util';

export class AuthService {
  /**
   * Login a user by name and type
   * Creates the user if it doesn't exist (as per assignment requirements)
   */
  async login(name: string, type: UserType): Promise<string> {
    // Validate user type
    if (!Object.values(UserType).includes(type)) {
      throw new ValidationError(
        `Invalid user type. Must be one of: ${Object.values(UserType).join(', ')}`
      );
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    // Find or create user
    const user = await userRepository.findOrCreate(name.trim(), type);

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user.id,
      name: user.name,
      type: user.type as UserType,
    };

    return generateToken(payload);
  }
}

export const authService = new AuthService();

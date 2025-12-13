export enum UserType {
  ADMIN = 'ADMIN',
  ENDUSER = 'ENDUSER',
  DRONE = 'DRONE',
}

export interface JWTPayload {
  userId: string;
  name: string;
  type: UserType;
}

export interface TokenPayload extends JWTPayload {
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  name: string;
  type: UserType;
}

export interface LoginResponse {
  token: string;
}

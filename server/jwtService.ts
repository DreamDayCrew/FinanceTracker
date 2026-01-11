import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

export interface JWTPayload {
  userId: number;
  email: string;
  type?: 'access' | 'refresh';
}

/**
 * Generate an access token for a user (short-lived)
 */
export function generateAccessToken(userId: number, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token for a user (long-lived)
 */
export function generateRefreshToken(userId: number, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(userId: number, email: string): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
}

/**
 * Legacy function for backward compatibility
 */
export function generateToken(userId: number, email: string): string {
  return generateAccessToken(userId, email);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Refresh a token (generates new token with same payload)
 */
export function refreshToken(token: string): string | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return generateToken(payload.userId, payload.email);
}

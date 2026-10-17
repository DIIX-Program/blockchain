import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { UserRole } from '@prisma/client';
import { config } from '../config';

/**
 * Payload embedded in (and extracted from) the stateless access token.
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}

/**
 * Signs a JWT access token carrying the authenticated user's identity.
 * Expiration duration is driven by JWT_EXPIRES_IN from configuration.
 */
export function signToken(payload: TokenPayload): string {
  // config.JWT_EXPIRES_IN is a plain string ("24h" etc.); jsonwebtoken's
  // expiresIn option expects the `ms` library's branded StringValue type.
  // Runtime-valid duration strings satisfy it; cast for the type system.
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as StringValue,
  });
}

/**
 * Verifies a JWT access token and returns its decoded payload.
 * Throws (via jsonwebtoken) if the token is invalid or expired;
 * the auth middleware converts those into UnauthorizedError.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

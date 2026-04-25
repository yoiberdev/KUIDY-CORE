import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface JwtPayload {
  sub: string;
  email: string;
}

const TOKEN_TTL = '7d';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.email) {
    throw new Error('Invalid token payload');
  }
  return { sub: String(decoded.sub), email: String(decoded.email) };
}

import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';

export type AuthVariables = {
  user: JwtPayload;
};

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7).trim();
  try {
    const payload = verifyToken(token);
    c.set('user', payload);
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  await next();
};

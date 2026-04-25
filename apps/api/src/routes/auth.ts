import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

const publicUser = (u: { id: string; email: string; name: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

export const authRoutes = new Hono<{ Variables: AuthVariables }>()
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password, name } = c.req.valid('json');

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      throw new HTTPException(409, { message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name: name ?? null })
      .returning({ id: users.id, email: users.email, name: users.name });

    if (!user) throw new HTTPException(500, { message: 'Failed to create user' });

    const token = signToken({ sub: user.id, email: user.email });
    return c.json({ user: publicUser(user), token }, 201);
  })

  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    const token = signToken({ sub: user.id, email: user.email });
    return c.json({ user: publicUser(user), token });
  })

  .get('/me', requireAuth, async (c) => {
    const { sub } = c.get('user');
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, sub));

    if (!user) throw new HTTPException(404, { message: 'User not found' });
    return c.json({ user: publicUser(user) });
  });

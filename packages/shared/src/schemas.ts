import { z } from 'zod';
import { FIELD_TYPES } from './types.js';

export const slugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug: lowercase, digits and hyphens (no leading/trailing hyphen)');

export const registerInput = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInput>;

export const projectCreateInput = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
export type ProjectCreateInput = z.infer<typeof projectCreateInput>;

export const moduleCreateInput = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(60).optional(),
  position: z.number().int().nonnegative().optional(),
});
export type ModuleCreateInput = z.infer<typeof moduleCreateInput>;

export const fieldCreateInput = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional().default(false),
  config: z.record(z.unknown()).optional().default({}),
  position: z.number().int().nonnegative().optional(),
});
export type FieldCreateInput = z.infer<typeof fieldCreateInput>;

import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits and hyphens (no leading/trailing hyphen)');

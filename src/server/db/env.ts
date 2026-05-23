import { z } from 'zod';

// Shared by server-only app modules and local CLI scripts; browser code must not import this file directly.
const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('private_chess'),
  AUTH_SESSION_SECRET: z.string().min(32),
});

export function getEnv() {
  return envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
  });
}

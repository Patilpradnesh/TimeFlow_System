import { z } from 'zod';
import dotenv from 'dotenv';

// Ensure .env is loaded before we validate
dotenv.config();

/**
 * Zod schema for environment variables
 * This enforces that all required environment variables are present and of the correct type
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").default('http://localhost:3000'),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long for security"),
});

// Validate the process.env object against our schema
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  
  // Throw an error to stop the server from starting if env is invalid
  // It's better to crash immediately than to have undefined behavior later
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;

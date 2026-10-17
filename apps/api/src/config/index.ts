import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/coldchain_db?schema=public'),
  JWT_SECRET: z.string().default('default_jwt_secret_for_development_replace_in_prod'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_API_KEY: z.string().optional(),
  BLOCKCHAIN_RPC_URL: z.string().default('http://127.0.0.1:8545'),
  CONTRACT_ADDRESS: z
    .string()
    .default('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
  DEPLOYER_PRIVATE_KEY: z
    .string()
    .default('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;

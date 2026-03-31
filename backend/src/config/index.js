import dotenv from 'dotenv';
import { parseCorsOriginsEnv } from './cors-origins.js';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET;
if (isProduction && !jwtSecret) {
  console.error('Fatal: JWT_SECRET is required in production. Set it in .env');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  jwt: {
    secret: jwtSecret || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai', // zai | openai
    openaiApiKey: process.env.OPENAI_API_KEY,
    zaiApiKey: process.env.ZAI_API_KEY,
  },
  cors: {
    // Comma-separated origins. Empty = allow all. Parsed in cors-origins.js (quotes, slashes, case).
    origins: parseCorsOriginsEnv(process.env.CORS_ORIGINS),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || null,
    bucket: process.env.S3_BUCKET || 'news-aggregator',
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || null,
    // MinIO by default: when S3_ENDPOINT is set, S3 is enabled even without explicit AWS_* keys (default minioadmin/minioadmin).
    enabled: Boolean(
      process.env.S3_ENDPOINT ||
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET)
    ),
  },
};

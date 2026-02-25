import dotenv from 'dotenv';

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
    // Comma-separated origins, e.g. http://localhost:3001,http://localhost:5174. Empty in dev = allow all.
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()) : null,
  },
};

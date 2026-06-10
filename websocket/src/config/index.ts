import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4001', 10),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',
  lockTimeoutMs: parseInt(process.env.LOCK_TIMEOUT_MS || '600000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

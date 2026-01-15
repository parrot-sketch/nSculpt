import { registerAs } from '@nestjs/config';

export default registerAs('prisma', () => ({
  databaseUrl: process.env.DATABASE_URL || '',
  logLevel: process.env.PRISMA_LOG_LEVEL || 'error',
}));













import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/httpException.filter';
import { AllExceptionsFilter } from './common/filters/allExceptions.filter';
import { PrismaClientExceptionFilter } from './common/filters/prismaClientException.filter';
import { CorrelationService } from './services/correlation.service';
import { ValidationPipe as CustomValidationPipe } from './common/pipes/validation.pipe';
import { getPrismaClient } from './prisma/client';

/**
 * Validate database connection before starting the application
 */
async function validateDatabaseConnection() {
  const prisma = getPrismaClient();
  const expectedDb = process.env.POSTGRES_DB || 'surgical_ehr';

  try {
    console.log('🔍 Validating database connection...');

    // Test connection
    await prisma.$connect();

    // Verify database name
    const result = await prisma.$queryRaw<Array<{ db_name: string }>>`
      SELECT current_database() as db_name
    `;
    const actualDb = result[0]?.db_name;

    if (actualDb !== expectedDb) {
      console.error(`\n❌ CRITICAL ERROR: Database name mismatch!`);
      console.error(`   Expected: ${expectedDb}`);
      console.error(`   Connected to: ${actualDb}`);
      console.error(`   Fix: Update POSTGRES_DB in .env file to match the actual database name.`);
      process.exit(1);
    }

    // Verify we can query
    await prisma.$queryRaw`SELECT 1`;

    console.log(`✅ Database connection validated: ${actualDb}`);
  } catch (error) {
    console.error(`\n❌ Database connection validation failed!`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    if (error instanceof Error) {
      if (error.message.includes('authentication failed')) {
        console.error(`\n   This usually means:`);
        console.error(`   1. Wrong password in DATABASE_URL`);
        console.error(`   2. Wrong database name in DATABASE_URL`);
        console.error(`   3. User doesn't have access to the database`);
      } else if (error.message.includes('does not exist')) {
        console.error(`\n   Database "${expectedDb}" does not exist.`);
        console.error(`   Create it or update POSTGRES_DB in .env file.`);
      }
    }

    process.exit(1);
  }
}

async function bootstrap() {
  // Validate database connection before creating the app
  await validateDatabaseConnection();

  const app = await NestFactory.create(AppModule);

  // Simple diagnostic logging
  app.use((req, res, next) => {
    console.log(`[Diagnostic] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
    next();
  });

  // Get configuration
  const configService = app.get(ConfigService);
  const correlationService = app.get(CorrelationService);
  const httpAdapterHost = app.get(HttpAdapterHost);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(new CustomValidationPipe());

  // Global exception filters - ORDER MATTERS (Catch-all last)
  // Filters catch exceptions in reverse order of their registration
  app.useGlobalFilters(
    new AllExceptionsFilter(httpAdapterHost, correlationService),
    new PrismaClientExceptionFilter(correlationService),
    new HttpExceptionFilter(correlationService),
  );

  // JWT guard is registered as APP_GUARD in AuthModule
  // This allows proper dependency injection of request-scoped services

  // CORS configuration
  const corsOrigin = configService.get<string>('app.cors.origin');
  // Handle wildcard or array of origins
  const allowedOrigins = corsOrigin === '*'
    ? true // Allow all origins (not recommended with credentials)
    : corsOrigin?.split(',').map(o => o.trim()) || ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();


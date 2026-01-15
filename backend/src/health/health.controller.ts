import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  ready() {
    // Check if database connection is active (simplified for now, ideally check Prisma)
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}

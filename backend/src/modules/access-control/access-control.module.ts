import { Module } from '@nestjs/common';
import { BreakGlassService } from './break-glass.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    providers: [BreakGlassService, PrismaService],
    exports: [BreakGlassService],
})
export class AccessControlModule { }

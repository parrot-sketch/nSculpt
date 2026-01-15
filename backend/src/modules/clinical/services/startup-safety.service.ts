
import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class StartupSafetyCheckService implements OnModuleInit {
    private readonly logger = new Logger(StartupSafetyCheckService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        this.logger.log('🛡️ Performing Critical Startup Safety Checks...');

        await this.verifyDatabaseTriggers();
        await this.verifyPrismaSingleton();

        this.logger.log('✅ Safety Checks Passed. System is secure.');
    }

    private async verifyDatabaseTriggers() {
        try {
            // Check for 'protect_final_observations' trigger
            const observationTrigger = await this.prisma.$queryRaw`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'observations' 
        AND trigger_name = 'trigger_protect_final_observations'
      `;

            if (!Array.isArray(observationTrigger) || observationTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_protect_final_observations');
            }

            // Check for 'check_encounter_locked' trigger function logic existence via condition trigger
            const conditionTrigger = await this.prisma.$queryRaw`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'conditions' 
        AND trigger_name = 'trigger_check_condition_lock'
      `;

            if (!Array.isArray(conditionTrigger) || conditionTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_check_condition_lock');
            }

            // Phase 2 Checks: Hard Delete Block & EMR Note Locking
            const deleteTrigger = await this.prisma.$queryRaw`
                SELECT trigger_name 
                FROM information_schema.triggers 
                WHERE event_object_table = 'observations' 
                AND trigger_name = 'trigger_block_final_delete'
            `;
            if (!Array.isArray(deleteTrigger) || deleteTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_block_final_delete (Phase 2 Forensic Gap)');
            }

            const noteLockTrigger = await this.prisma.$queryRaw`
                 SELECT trigger_name 
                 FROM information_schema.triggers 
                 WHERE event_object_table = 'emr_notes' 
                 AND trigger_name = 'trigger_chk_note_lock'
            `;
            if (!Array.isArray(noteLockTrigger) || noteLockTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_chk_note_lock (Phase 2 Scope Gap)');
            }

            // Phase 3 Checks: Root Integrity (Encounters & Notes)
            const encStateTrigger = await this.prisma.$queryRaw`
                SELECT trigger_name FROM information_schema.triggers 
                WHERE event_object_table = 'encounters' AND trigger_name = 'trigger_protect_encounter_state'
            `;
            if (!Array.isArray(encStateTrigger) || encStateTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_protect_encounter_state (Phase 3 Root Gap)');
            }

            const encDeleteTrigger = await this.prisma.$queryRaw`
                SELECT trigger_name FROM information_schema.triggers 
                WHERE event_object_table = 'encounters' AND trigger_name = 'trigger_block_encounter_delete'
            `;
            if (!Array.isArray(encDeleteTrigger) || encDeleteTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_block_encounter_delete (Phase 3 Forensic Gap)');
            }

            const noteSelfLockTrigger = await this.prisma.$queryRaw`
                SELECT trigger_name FROM information_schema.triggers 
                WHERE event_object_table = 'emr_notes' AND trigger_name = 'trigger_protect_locked_note'
            `;
            if (!Array.isArray(noteSelfLockTrigger) || noteSelfLockTrigger.length === 0) {
                throw new Error('MISSING TRIGGER: trigger_protect_locked_note (Phase 3 Note Integrity Gap)');
            }

        } catch (e) {
            this.logger.error(`❌ DATABASE UNSAFE: ${e.message}`);
            throw new InternalServerErrorException('System refused to start: Database safety triggers are missing.');
        }
    }

    private async verifyPrismaSingleton() {
        // Basic check to ensure we are using the service, not much to do here at runtime 
        // other than ensuring DI worked, which is implicit if we got here.
        if (!this.prisma) {
            throw new InternalServerErrorException('PrismaService failed to inject.');
        }
    }
}

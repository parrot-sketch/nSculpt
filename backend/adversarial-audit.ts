
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { ClinicalService } from './src/modules/clinical/clinical.service';
import { EncounterService } from './src/modules/encounter/encounter.service';
import { ClsService } from 'nestjs-cls';
import { PrismaClient } from '@prisma/client';

// Bypass enum imports issues by using strings or checking object
const EncounterStatus = {
    FINISHED: 'FINISHED'
};
const ObservationStatus = {
    FINAL: 'FINAL',
    PRELIMINARY: 'PRELIMINARY'
};
const EncounterClass = {
    EMERGENCY: 'EMERGENCY',
    AMBULATORY: 'AMBULATORY'
};

async function runAdversarialAudit() {
    console.log('💀 STARTING ADVERSARIAL CLINICAL AUDIT 💀');
    console.log('==========================================');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const prismaService = app.get(PrismaService) as any; // Cast to any to access .observation
    const rawPrisma = new PrismaClient() as any; // Cast to any
    const clinicalService = app.get(ClinicalService);
    const encounterService = app.get(EncounterService);
    const cls = app.get(ClsService);

    // Setup: Create a dummy actor
    const auditorId = 'auditor-uuid-' + Date.now().toString().slice(-6);
    const doctorId = '123e4567-e89b-12d3-a456-426614174000';
    const patientId = '123e4567-e89b-12d3-a456-426614174001';

    try {
        // Create Doctor
        await rawPrisma.user.upsert({
            where: { id: doctorId },
            update: {},
            create: {
                id: doctorId,
                email: 'dr.doom@audit.com',
                firstName: 'Victor',
                lastName: 'Doom',
                passwordHash: 'xx',
                roleAssignments: { create: { role: { connectOrCreate: { where: { code: 'DOCTOR' }, create: { code: 'DOCTOR', name: 'Doctor', description: 'MD', domain: 'MEDICAL_RECORDS' } } } } }
            }
        });

        // Create Patient
        await rawPrisma.patient.upsert({
            where: { id: patientId },
            update: {},
            create: {
                id: patientId,
                firstName: 'Test',
                lastName: 'Patient',
                email: 'p@test.com',
                dateOfBirth: new Date('1980-01-01'),
                gender: 'M',
                patientNumber: 'P-001-' + Date.now(),
                fileNumber: 'F-001-' + Date.now()
            }
        });
    } catch (e) {
        console.log('Setup warning (ignorable if exists): ' + (e as Error).message);
    }

    // Mock CLS context for Doctor
    await cls.run(async () => {
        cls.set('user', { id: doctorId, roles: ['DOCTOR'] });

        // ---------------------------------------------------------
        // TEST 1: IMMUTABILITY & LOCKING
        // ---------------------------------------------------------
        console.log('\n[TEST 1] Testing Immutability & Locking...');

        // Create Encounter
        const encounter = await encounterService.createEncounter({
            patientId: patientId,
            type: 'EMERGENCY',
            class: EncounterClass.EMERGENCY as any,
            serviceProviderId: '123e4567-e89b-12d3-a456-426614174099',
            createdById: doctorId
        });
        console.log(`> Created Encounter: ${encounter.id}`);

        // Create Observation
        const obs = await clinicalService.addObservation({
            patientId: patientId,
            encounterId: encounter.id,
            category: 'vital-signs',
            code: '8867-4', // Heart rate
            display: 'Heart Rate',
            valueQuantity: 80,
            valueUnit: 'bpm',
            createdById: doctorId
        });
        console.log(`> Created Observation: ${obs.id}`);

        // Lock Encounter
        await encounterService.updateStatus(encounter.id, EncounterStatus.FINISHED as any, doctorId);
        await encounterService.lockEncounter(encounter.id, doctorId);
        console.log(`> Locked Encounter: ${encounter.id}`);

        // ATTACK 1.1: Try to add observation to locked encounter via Service
        try {
            await clinicalService.addObservation({
                patientId: patientId,
                encounterId: encounter.id,
                category: 'vital-signs',
                code: '8867-4',
                display: 'Heart Rate 2',
                valueQuantity: 120,
                valueUnit: 'bpm',
                createdById: doctorId
            });
            console.log('❌ [CRITICAL] ATTACK 1.1 SUCCEEDED: Service allowed add to locked encounter');
        } catch (e) {
            console.log(`✅ ATTACK 1.1 BLOCKED: Service rejected add to locked encounter`);
        }

        // ATTACK 1.2: Try to insert observation to locked encounter via Raw Prisma (Bypass Service)
        try {
            await prismaService.observation.create({
                data: {
                    encounterId: encounter.id,
                    patientId: patientId,
                    category: 'vital-signs',
                    code: '8867-4',
                    display: 'Malicious',
                    valueQuantity: 999,
                    valueUnit: 'bpm',
                    status: ObservationStatus.FINAL,
                    effectiveDateTime: new Date(),
                    isLatest: true,
                    version: 1,
                    createdById: doctorId, // Service injected
                }
            });
            console.log('❌ [CRITICAL] ATTACK 1.2 SUCCEEDED: DB Trigger failed to block insert to locked encounter');
        } catch (e) {
            console.log(`✅ ATTACK 1.2 BLOCKED: DB Trigger blocked insert`);
        }

        // ATTACK 1.3: Modify FINAL observation directly via Prisma
        try {
            await prismaService.observation.update({
                where: { id: obs.id },
                data: { valueQuantity: 0 }
            });
            console.log('❌ [CRITICAL] ATTACK 1.3 SUCCEEDED: DB Trigger failed to block update to FINAL observation');
        } catch (e) {
            console.log(`✅ ATTACK 1.3 BLOCKED: DB Trigger blocked update to FINAL observation`);
        }

        // ---------------------------------------------------------
        // TEST 2: AUDIT SPOOFING
        // ---------------------------------------------------------
        console.log('\n[TEST 2] Testing Audit Spoofing...');

        const maliciousId = '123e4567-e89b-12d3-a456-426614174666'; // Malicious UUID

        // Create open encounter for audit tests
        const openEncounter = await encounterService.createEncounter({
            patientId: patientId,
            type: 'EMERGENCY',
            class: EncounterClass.EMERGENCY as any,
            serviceProviderId: '123e4567-e89b-12d3-a456-426614174099',
            createdById: doctorId
        });

        try {
            const spoofed = await prismaService.observation.create({
                data: {
                    encounterId: openEncounter.id,
                    patientId: patientId,
                    category: 'test',
                    code: 'TEST',
                    display: 'Spoof Test',
                    valueQuantity: 1,
                    valueUnit: 'x',
                    status: ObservationStatus.PRELIMINARY,
                    effectiveDateTime: new Date(),
                    isLatest: true,
                    version: 1,
                    createdById: maliciousId // <--- SPOOF ATTEMPT
                }
            });

            if (spoofed.createdById === maliciousId) {
                console.log(`❌ [CRITICAL] ATTACK 2.1 SUCCEEDED: Prisma Extension allowed spoofed createdById (${spoofed.createdById})`);
            } else {
                console.log(`✅ ATTACK 2.1 BLOCKED: Prisma Extension overwrote spoofed ID (Got: ${spoofed.createdById}, Expected: ${doctorId})`);
            }

        } catch (e) {
            console.log(`? ATTACK 2.1 Failed with unexpected error: ${(e as Error).message}`);
        }

        // ATTACK 2.2: Bypass Audit Extension entirely (Raw Client)
        console.log('> Attempting to insert via raw PrismaClient (bypassing AuditExtension)...');
        try {
            const rawObs = await rawPrisma.observation.create({
                data: {
                    encounterId: openEncounter.id,
                    patientId: patientId,
                    category: 'raw',
                    code: 'RAW_INSERT',
                    display: 'Raw Insert',
                    valueQuantity: 123,
                    valueUnit: 'x',
                    status: ObservationStatus.PRELIMINARY,
                    effectiveDateTime: new Date(),
                    isLatest: true,
                    version: 1,
                    createdById: maliciousId // Can we set it?
                }
            });

            if (rawObs.createdById === maliciousId) {
                console.log(`❌ [DEFECT] ATTACK 2.2 SUCCEEDED: Raw Prisma Client allowed bypass. createdById: ${rawObs.createdById}`);
            } else {
                console.log(`✅ ATTACK 2.2 FAILED? Unexpectedly blocked: ${rawObs.createdById}`);
            }

        } catch (e) {
            console.log(`✅ ATTACK 2.2 FAILED: ${(e as Error).message}`);
        }


        // ---------------------------------------------------------
        // TEST 3: VERSIONING INTEGRITY
        // ---------------------------------------------------------
        console.log('\n[TEST 3] Testing Forensics & Versioning...');

        // V1
        const v1 = await clinicalService.addObservation({
            patientId: patientId,
            encounterId: openEncounter.id,
            category: 'vital-signs',
            code: 'BP',
            display: 'BP',
            valueQuantity: 120,
            valueUnit: 'mmHg',
            createdById: doctorId
        });
        console.log(`> V1 Created: ${v1.id} (Val: 120)`);

        // V2 (Amendment)
        // amendObservation(userId, originalId, newData)
        const v2 = await clinicalService.amendObservation(doctorId, v1.id, {
            valueQuantity: 180,
        });
        console.log(`> V2 Created: ${v2.id} (Val: 180)`);

        // Checks
        const v1Check = await prismaService.observation.findUnique({ where: { id: v1.id } });
        const v2Check = await prismaService.observation.findUnique({ where: { id: v2.id } });

        if (v1Check.isLatest === false && v2Check.isLatest === true) {
            console.log('✅ Version flags correct (V1: false, V2: true)');
        } else {
            console.log(`❌ [CRITICAL] Version flags BROKEN (V1: ${v1Check.isLatest}, V2: ${v2Check.isLatest})`);
        }

        if (v2Check.previousVersionId === v1.id) {
            console.log('✅ Forensic Chain intact (V2 points to V1)');
        } else {
            console.log(`❌ [CRITICAL] Forensic Chain BROKEN (V2 prev: ${v2Check.previousVersionId})`);
        }

    });

    await app.close();
    console.log('\n==========================================');
    console.log('💀 ADVERSARIAL AUDIT COMPLETE 💀');
}

runAdversarialAudit().catch(e => console.error(e));

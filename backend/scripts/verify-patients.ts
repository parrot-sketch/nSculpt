import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('--- Verifying Patient-User Linkage ---');

    // 1. Users with PATIENT role
    const patientUsers = await prisma.user.findMany({
        where: {
            roleAssignments: {
                some: {
                    role: {
                        code: 'PATIENT'
                    }
                }
            }
        },
        include: {
            patientAccount: true,
            roleAssignments: {
                include: {
                    role: true
                }
            }
        }
    });

    console.log(`Found ${patientUsers.length} users with PATIENT role.`);

    const usersWithoutPatient = patientUsers.filter(u => !u.patientAccount);
    console.log(`Users with PATIENT role but NO patient record: ${usersWithoutPatient.length}`);
    usersWithoutPatient.forEach(u => {
        console.log(`- User: ${u.email} (ID: ${u.id})`);
    });

    // 2. Patients without userId
    const orphanedPatients = await prisma.patient.findMany({
        where: {
            userId: null
        }
    });

    console.log(`Found ${orphanedPatients.length} patient records with NO userId.`);
    orphanedPatients.forEach(p => {
        console.log(`- Patient: ${p.firstName} ${p.lastName} (${p.email}) (ID: ${p.id})`);
    });

    // 3. Patients with userId that doesn't exist (unlikely due to FK)

    console.log('--- End of Verification ---');
}

verify()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'frontdesk@nairobi-sculpt.com';
    console.log(`Checking roles for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            roleAssignments: {
                include: {
                    role: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log('User found:', user.id);
    console.log('Role Assignments:', JSON.stringify(user.roleAssignments, null, 2));

    const now = new Date();
    console.log('Current Server Time:', now.toISOString());

    // Manually simulate the repository filter
    const activeAssignments = user.roleAssignments.filter(a => {
        const validFrom = new Date(a.validFrom);
        const validUntil = a.validUntil ? new Date(a.validUntil) : null;

        const isActive = a.isActive;
        const notRevoked = !a.revokedAt;
        const started = validFrom <= now;
        const notEnded = !validUntil || validUntil > now;

        console.log(`Assignment ${a.id}:`, {
            role: a.role.code,
            isActive,
            notRevoked,
            started,
            notEnded,
            validFrom: validFrom.toISOString(),
            validUntil: validUntil?.toISOString()
        });

        return isActive && notRevoked && started && notEnded;
    });

    console.log('Active Assignments Count:', activeAssignments.length);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

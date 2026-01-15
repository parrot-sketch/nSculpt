
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const doctor = await prisma.user.findFirst({
        where: { email: 'drken@nairobisculpt.com' }
    });

    if (!doctor) {
        console.log('Doctor not found');
        return;
    }

    const appointments = await prisma.appointment.findMany({
        where: {
            doctorId: doctor.id,
            status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] }
        },
        orderBy: { scheduledStartTime: 'asc' }
    });

    console.log(`Appointments for Dr. Ken Aluora (${doctor.id}):`);
    appointments.forEach(a => {
        console.log(`- ${a.appointmentNumber}: ${a.scheduledStartTime} to ${a.scheduledEndTime} (${a.status})`);
    });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

/**
 * Quick fix script to assign ADMIN role to admin user
 * Run with: npx ts-node scripts/fix-admin-role.ts
 */

import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './backend/prisma/client';

const prisma = getPrismaClient();

async function main() {
  console.log('🔧 Fixing admin user role assignment...');

  // 1. Find admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@nairobi-sculpt.com' },
  });

  if (!adminUser) {
    console.error('❌ Admin user not found!');
    process.exit(1);
  }

  console.log(`✅ Found admin user: ${adminUser.id}`);

  // 2. Find ADMIN role
  const adminRole = await prisma.role.findUnique({
    where: { code: 'ADMIN' },
  });

  if (!adminRole) {
    console.error('❌ ADMIN role not found! Please run seed script first.');
    process.exit(1);
  }

  console.log(`✅ Found ADMIN role: ${adminRole.id}`);

  // 3. Check if assignment already exists
  const existingAssignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  if (existingAssignment) {
    console.log('✅ Admin user already has ADMIN role assigned');
    process.exit(0);
  }

  // 4. Create role assignment
  const assignment = await prisma.userRoleAssignment.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      isActive: true,
      validFrom: new Date(),
      validUntil: null, // Permanent assignment
      createdBy: adminUser.id, // Self-assigned
    },
  });

  console.log(`✅ Created role assignment: ${assignment.id}`);
  console.log('✨ Admin user now has ADMIN role!');
  console.log('\n📝 Next steps:');
  console.log('   1. Log out and log back in');
  console.log('   2. You should now have access to admin features');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

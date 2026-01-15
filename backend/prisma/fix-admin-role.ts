/**
 * Quick fix script to assign ADMIN role to admin user
 * Creates roles and permissions if they don't exist, then assigns ADMIN role
 * Run with: npx ts-node prisma/fix-admin-role.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing admin user role and permissions...');

  // 1. Find or create ADMIN role
  let adminRole = await prisma.role.findUnique({
    where: { code: 'ADMIN' },
  });

  if (!adminRole) {
    console.log('⚠️  ADMIN role not found. Creating it...');
    adminRole = await prisma.role.create({
      data: {
        code: 'ADMIN',
        name: 'System Administrator',
        description: 'Full system access with all permissions',
        isActive: true,
      },
    });
    console.log(`✅ Created ADMIN role: ${adminRole.id}`);
  } else {
    console.log(`✅ Found ADMIN role: ${adminRole.id}`);
  }

  // 2. Find admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@nairobi-sculpt.com' },
  });

  if (!adminUser) {
    console.error('❌ Admin user not found!');
    process.exit(1);
  }

  console.log(`✅ Found admin user: ${adminUser.id}`);

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
    console.log(`   Assignment ID: ${existingAssignment.id}`);
  } else {
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
  }

  // 5. Check if permissions exist and assign all to ADMIN role
  const permissionCount = await prisma.permission.count();
  if (permissionCount === 0) {
    console.log('⚠️  No permissions found. You may need to run the full seed script.');
    console.log('   For now, the ADMIN role exists but has no permissions.');
  } else {
    console.log(`✅ Found ${permissionCount} permissions in database`);
    
    // Get all permissions
    const allPermissions = await prisma.permission.findMany();
    
    // Check which permissions are already assigned
    const assignedPermissions = await prisma.rolePermission.findMany({
      where: { roleId: adminRole.id },
      select: { permissionId: true },
    });
    
    const assignedIds = new Set(assignedPermissions.map(rp => rp.permissionId));
    const missingPermissions = allPermissions.filter(p => !assignedIds.has(p.id));
    
    if (missingPermissions.length > 0) {
      console.log(`⚠️  ADMIN role missing ${missingPermissions.length} permissions. Assigning...`);
      for (const perm of missingPermissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }
      console.log(`✅ Assigned ${missingPermissions.length} permissions to ADMIN role`);
    } else {
      console.log('✅ ADMIN role has all permissions assigned');
    }
  }

  console.log('\n✨ Fix complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Log out and log back in');
  console.log('   2. You should now have access to admin features');
  console.log('   3. The /auth/me endpoint should return roles: ["ADMIN"]');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

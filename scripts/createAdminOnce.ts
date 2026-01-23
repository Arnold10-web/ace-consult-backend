import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminOnce() {
  try {
    // Check if admin already exists in database
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('👤 Admin user already exists in database. Skipping...');
      return;
    }

    console.log('🚀 Creating admin user for the first time...');

    // Create the one and only admin
    const adminData = {
      name: 'Admin',
      email: 'admin@aceconsultltd.com',
      password: 'Admin@123456',
    };

    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    const admin = await prisma.admin.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminData.password}`);
    console.log('\n⚠️  IMPORTANT: Change your password after first login!');

  } catch (error) {
    console.error('❌ Error in admin setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminOnce();
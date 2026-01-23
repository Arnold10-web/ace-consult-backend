import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('⏭️  Admin user already exists. Skipping admin creation...');
      return;
    }

    console.log('🚀 Creating default admin user...');

    // Fixed admin credentials for initial setup
    const defaultAdmin = {
      name: 'Admin',
      email: 'admin@aceconsultltd.com',
      password: 'Admin@123456',
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        name: defaultAdmin.name,
        email: defaultAdmin.email,
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log('✅ Default admin user created successfully!');
    console.log(`\n📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${defaultAdmin.password}`);
    console.log('\n⚠️  IMPORTANT: This admin will only be created once. Change your password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAdmin();

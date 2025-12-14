import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('⏭️  Admin user already exists. Skipping...');
      process.exit(0);
    }

    console.log('🚀 Creating default admin user...');

    // Default admin credentials (change these after first login!)
    const defaultAdmin = {
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@aceconsultltd.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
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
    console.log('\n⚠️  IMPORTANT: Change your password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAdmin();

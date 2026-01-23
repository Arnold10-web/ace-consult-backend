import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createAdminOnce() {
  const flagFile = path.join(__dirname, '../.admin-created');
  
  try {
    // Check if flag file exists (admin already created)
    if (fs.existsSync(flagFile)) {
      console.log('🔒 Admin setup already completed. Skipping...');
      return;
    }

    // Check if admin already exists in database
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('👤 Admin user already exists in database');
      // Create flag file to prevent future runs
      fs.writeFileSync(flagFile, 'Admin created on: ' + new Date().toISOString());
      console.log('🔒 Admin creation disabled for future deployments');
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

    // Create flag file to prevent future admin creation
    fs.writeFileSync(flagFile, `Admin created on: ${new Date().toISOString()}\nAdmin ID: ${admin.id}`);

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminData.password}`);
    console.log('🔒 Admin creation disabled for all future deployments');
    console.log('\n⚠️  IMPORTANT: Change your password after first login!');

  } catch (error) {
    console.error('❌ Error in admin setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminOnce();
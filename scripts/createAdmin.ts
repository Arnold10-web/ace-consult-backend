import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createFirstAdmin() {
  try {
    // Check if admin already exists
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('❌ Admin user already exists. Registration is closed.');
      process.exit(1);
    }

    console.log('🚀 Creating first admin user...\n');

    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 8 characters): ');

    if (!name || !email || !password) {
      console.log('❌ All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`\nAdmin Details:`);
    console.log(`ID: ${admin.id}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log('\n🎉 You can now login to the admin dashboard');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

createFirstAdmin();

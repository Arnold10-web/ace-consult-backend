import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createInitialAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check if admin already exists
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      res.status(400).json({ 
        success: false,
        message: 'Admin user already exists. Cannot create additional admin users via this endpoint.' 
      });
      return;
    }

    console.log('🚀 Creating initial admin user via API...');

    // Create the admin
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

    console.log('✅ Initial admin created successfully via API');

    res.status(201).json({
      success: true,
      message: 'Initial admin user created successfully',
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating initial admin via API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create initial admin user',
      error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
};
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { optimizeImage, deleteImage } from '../utils/imageProcessor';

const prisma = new PrismaClient();

// PUBLIC: Get settings
export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get first settings record (there should only be one)
    const settings = await prisma.settings.findFirst();

    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }

    res.json({
      data: settings,
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Update settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      tagline,
      description,
      contactEmail,
      phone,
      address,
      socialLinks,
      heroImages,
      heroTitle,
      heroSubtitle,
      seoDefaultTitle,
      seoDefaultDesc,
    } = req.body;

    // Get first settings record or create if doesn't exist
    let settings = await prisma.settings.findFirst();

    // Handle logo upload
    let logoPath = settings?.logo || null;
    let heroImagePaths = settings?.heroImages || [];

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Handle logo upload
      if (files.logo && files.logo[0]) {
        // Delete old logo if exists
        if (settings?.logo) {
          await deleteImage(settings.logo);
        }
        const optimized = await optimizeImage(files.logo[0].path);
        logoPath = optimized.original;
      }
      
      // Handle hero images upload
      if (files.heroImages && files.heroImages.length > 0) {
        // Delete old hero images
        if (settings?.heroImages && Array.isArray(settings.heroImages)) {
          for (const oldImage of settings.heroImages) {
            await deleteImage(oldImage);
          }
        }
        
        // Process new hero images
        const newHeroImages = [];
        for (const file of files.heroImages) {
          const optimized = await optimizeImage(file.path);
          newHeroImages.push(optimized.original);
        }
        heroImagePaths = newHeroImages;
      }
    }

    // Handle hero images from JSON (if sent as string)
    if (heroImages && typeof heroImages === 'string') {
      try {
        const parsedImages = JSON.parse(heroImages);
        if (Array.isArray(parsedImages)) {
          heroImagePaths = parsedImages;
        }
      } catch {
        // Keep existing heroImagePaths
      }
    }

    if (!settings) {
      // Create new settings
      settings = await prisma.settings.create({
        data: {
          companyName: companyName || 'Architecture Consultancy',
          tagline: tagline || null,
          description: description || null,
          contactEmail: contactEmail || 'contact@example.com',
          phone: phone || null,
          address: address || null,
          socialLinks: socialLinks || null,
          heroImages: heroImagePaths,
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          seoDefaultTitle: seoDefaultTitle || null,
          seoDefaultDesc: seoDefaultDesc || null,
          logo: logoPath,
        },
      });
    } else {
      // Update existing settings
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          companyName,
          tagline: tagline || null,
          description: description || null,
          contactEmail,
          phone: phone || null,
          address: address || null,
          socialLinks: socialLinks || null,
          heroImages: heroImagePaths,
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          seoDefaultTitle: seoDefaultTitle || null,
          seoDefaultDesc: seoDefaultDesc || null,
          logo: logoPath,
        },
      });
    }

    res.json({
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Change admin password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    // Get the admin user
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      res.status(404).json({ message: 'Admin user not found' });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.admin.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
          heroImages: heroImages || [],
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          seoDefaultTitle: seoDefaultTitle || null,
          seoDefaultDesc: seoDefaultDesc || null,
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
          heroImages: heroImages || [],
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          seoDefaultTitle: seoDefaultTitle || null,
          seoDefaultDesc: seoDefaultDesc || null,
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

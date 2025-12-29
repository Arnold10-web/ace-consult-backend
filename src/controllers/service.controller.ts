import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optimizeImage, deleteImage } from '../utils/imageProcessor';

const prisma = new PrismaClient();

// PUBLIC: Get all active services
export const getServices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    res.json({
      data: services,
      message: 'Services retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get all services
export const getAdminServices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { order: 'asc' },
    });

    res.json({
      data: services,
      message: 'Services retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get service by ID
export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    res.json({
      data: service,
      message: 'Service retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create service
export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, features, isActive, order } = req.body;

    if (!title || !description) {
      res.status(400).json({ message: 'Title and description are required' });
      return;
    }

    // Handle image uploads
    let iconPath = null;
    let imagePath = null;

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files.icon && files.icon[0]) {
        const optimized = await optimizeImage(files.icon[0].path);
        iconPath = optimized.original;
      }
      
      if (files.image && files.image[0]) {
        const optimized = await optimizeImage(files.image[0].path);
        imagePath = optimized.original;
      }
    }

    // Parse features if it's a string
    let featuresArray = features || [];
    if (typeof features === 'string') {
      featuresArray = features.split(',').map((f: string) => f.trim()).filter(Boolean);
    }

    const service = await prisma.service.create({
      data: {
        title,
        description,
        icon: iconPath,
        image: imagePath,
        features: featuresArray,
        isActive: isActive === 'true' || isActive === true,
        order: order ? parseInt(order) : 0,
      },
    });

    res.status(201).json({
      data: service,
      message: 'Service created successfully',
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Update service
export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, features, isActive, order } = req.body;

    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    // Handle image uploads
    let iconPath = existingService.icon;
    let imagePath = existingService.image;

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files.icon && files.icon[0]) {
        // Delete old icon if exists
        if (existingService.icon) {
          await deleteImage(existingService.icon);
        }
        const optimized = await optimizeImage(files.icon[0].path);
        iconPath = optimized.original;
      }
      
      if (files.image && files.image[0]) {
        // Delete old image if exists
        if (existingService.image) {
          await deleteImage(existingService.image);
        }
        const optimized = await optimizeImage(files.image[0].path);
        imagePath = optimized.original;
      }
    }

    // Parse features if it's a string
    let featuresArray = features || existingService.features;
    if (typeof features === 'string') {
      featuresArray = features.split(',').map((f: string) => f.trim()).filter(Boolean);
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        title: title || existingService.title,
        description: description || existingService.description,
        icon: iconPath,
        image: imagePath,
        features: featuresArray,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : existingService.isActive,
        order: order !== undefined ? parseInt(order) : existingService.order,
      },
    });

    res.json({
      data: service,
      message: 'Service updated successfully',
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Delete service
export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    // No image/icon cleanup needed anymore

    await prisma.service.delete({
      where: { id },
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Service not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
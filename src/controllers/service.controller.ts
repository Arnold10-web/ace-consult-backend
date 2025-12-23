import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Image processing removed; services are text-only

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

    // Image/icon uploads removed; services now text-only
    const iconPath = null;
    const imagePath = null;

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

    // Image/icon uploads removed; keep existing values null
    const iconPath = null;
    const imagePath = null;

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
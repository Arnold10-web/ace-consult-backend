import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optimizeImage, deleteImage } from '../utils/imageProcessor';

const prisma = new PrismaClient();

// ADMIN: Upload media files
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const mediaRecords = [];

    for (const file of files) {
      try {
        const optimized = await optimizeImage(file.path);
        
        const media = await prisma.media.create({
          data: {
            filename: file.originalname,
            filepath: optimized.original,
            mimetype: file.mimetype,
            size: file.size,
          },
        });

        mediaRecords.push(media);
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    res.status(201).json({
      data: mediaRecords,
      message: `${mediaRecords.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get all media
export const getAllMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.media.count(),
    ]);

    res.json({
      data: media,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Delete media
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const media = await prisma.media.findUnique({ where: { id } });
    
    if (!media) {
      res.status(404).json({ message: 'Media not found' });
      return;
    }

    // Delete file
    try {
      await deleteImage(media.filepath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete database record
    await prisma.media.delete({ where: { id } });

    res.json({
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

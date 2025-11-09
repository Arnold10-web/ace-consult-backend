import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUBLIC: Submit contact form
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, projectType, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      res.status(400).json({ message: 'Name, email, and message are required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        projectType: projectType || null,
        message,
      },
    });

    res.status(201).json({
      data: submission,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get all contact submissions
export const getContactSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', isRead } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    res.json({
      data: submissions,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Mark submission as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      data: submission,
      message: 'Contact submission marked as read',
    });
  } catch (error) {
    console.error('Error marking submission as read:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Contact submission not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// ADMIN: Delete contact submission
export const deleteContactSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.contactSubmission.delete({
      where: { id },
    });

    res.json({
      message: 'Contact submission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Contact submission not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

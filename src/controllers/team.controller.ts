import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optimizeImage, deleteImage } from '../utils/imageProcessor';

const prisma = new PrismaClient();

// PUBLIC: Get all team members
export const getTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      data: teamMembers,
      message: 'Team members retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create team member
export const createTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, title, department, bio, email, linkedin, order } = req.body;

    if (!name || !title) {
      res.status(400).json({ message: 'Name and title are required' });
      return;
    }

    // Handle photo upload
    let photoUrl: string | null = null;
    const file = req.file;
    
    if (file) {
      try {
        const optimized = await optimizeImage(file.path);
        photoUrl = optimized.original;
      } catch (error) {
        console.error('Error optimizing photo:', error);
      }
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        name,
        title,
        department: department || null,
        bio: bio || null,
        photo: photoUrl,
        email: email || null,
        linkedin: linkedin || null,
        order: order ? parseInt(order) : 0,
      },
    });

    res.status(201).json({
      data: teamMember,
      message: 'Team member created successfully',
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Update team member
export const updateTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, title, department, bio, email, linkedin, order, removePhoto } = req.body;

    // Get existing team member
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    
    if (!existing) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Handle photo upload
    let photoUrl = existing.photo;
    
    // Delete old photo if removing or replacing
    if ((removePhoto === 'true' || req.file) && existing.photo) {
      try {
        await deleteImage(existing.photo);
        photoUrl = null;
      } catch (error) {
        console.error('Error deleting old photo:', error);
      }
    }
    
    // Upload new photo
    if (req.file) {
      try {
        const optimized = await optimizeImage(req.file.path);
        photoUrl = optimized.original;
      } catch (error) {
        console.error('Error optimizing photo:', error);
      }
    }

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        name,
        title,
        department: department || null,
        bio: bio || null,
        photo: photoUrl,
        email: email || null,
        linkedin: linkedin || null,
        order: order ? parseInt(order) : undefined,
      },
    });

    res.json({
      data: teamMember,
      message: 'Team member updated successfully',
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Delete team member
export const deleteTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teamMember = await prisma.teamMember.findUnique({ where: { id } });
    
    if (!teamMember) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Delete photo if exists
    if (teamMember.photo) {
      try {
        await deleteImage(teamMember.photo);
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }

    await prisma.teamMember.delete({ where: { id } });

    res.json({
      message: 'Team member deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

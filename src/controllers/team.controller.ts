import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { deleteImage } from '../utils/simpleImageProcessor';
import * as path from 'path';

const prisma = new PrismaClient();

// PUBLIC: Get all team members
export const getTeamMembers = async (_req: Request, res: Response): Promise<void> => {
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

// PUBLIC: Get team member by ID
export const getTeamMemberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
    });

    if (!teamMember) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    res.json({
      data: teamMember,
      message: 'Team member retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create team member
export const createTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, title, department, bio, email, linkedin, order } = req.body;

    console.log('Team member creation data:', {
      name,
      title,
      department,
      bio,
      email,
      linkedin,
      order,
      hasFile: !!req.file
    });

    if (!name || !title) {
      res.status(400).json({ message: 'Name and title are required' });
      return;
    }

    // Handle photo upload with simpler processing
    let photoUrl: string | null = null;
    const file = req.file;
    
    if (file) {
      try {
        // Simple image processing - just resize and compress for team photos
        const filename = path.basename(file.path, path.extname(file.path));
        const uploadDir = process.env.NODE_ENV === 'production' 
          ? (process.env.UPLOAD_DIR || '/app/uploads')
          : path.join(__dirname, '../../uploads');
        
        const outputName = `${filename}_team.jpg`;
        const outputPath = path.join(uploadDir, outputName);
        
        // Simple resize to 400x400 for team photos
        await require('sharp')(file.path)
          .resize(400, 400, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 85 })
          .toFile(outputPath);
        
        // Remove original
        await require('fs').promises.unlink(file.path);
        
        photoUrl = `/uploads/${outputName}`;
        console.log('Team photo processed successfully:', photoUrl);
      } catch (error) {
        console.error('Error processing team photo:', error);
        // Fallback: use original file
        const filename = path.basename(file.path);
        photoUrl = `/uploads/${filename}`;
      }
    }

    // Ensure proper data types
    const memberData = {
      name: name || '',
      title: title || '',
      department: (department && department.trim() !== '') ? department : null,
      bio: (bio && bio.trim() !== '') ? bio : null,
      photo: photoUrl,
      email: (email && email.trim() !== '') ? email : null,
      linkedin: (linkedin && linkedin.trim() !== '') ? linkedin : null,
      order: order ? parseInt(order) : 0,
    };

    console.log('Processed member data:', memberData);

    const teamMember = await prisma.teamMember.create({
      data: memberData,
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
    
    // Upload new photo with simpler processing
    if (req.file) {
      try {
        // Simple image processing for team photo update
        const filename = path.basename(req.file.path, path.extname(req.file.path));
        const uploadDir = process.env.NODE_ENV === 'production' 
          ? (process.env.UPLOAD_DIR || '/app/uploads')
          : path.join(__dirname, '../../uploads');
        
        const outputName = `${filename}_team.jpg`;
        const outputPath = path.join(uploadDir, outputName);
        
        // Simple resize to 400x400 for team photos
        await require('sharp')(req.file.path)
          .resize(400, 400, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 85 })
          .toFile(outputPath);
        
        // Remove original
        await require('fs').promises.unlink(req.file.path);
        
        photoUrl = `/uploads/${outputName}`;
        console.log('Team photo updated successfully:', photoUrl);
      } catch (error) {
        console.error('Error processing updated team photo:', error);
        // Fallback: use original file
        const filename = path.basename(req.file.path);
        photoUrl = `/uploads/${filename}`;
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

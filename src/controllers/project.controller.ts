import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optimizeImage, deleteImage } from '../utils/imageProcessor';

const prisma = new PrismaClient();

// Generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// PUBLIC: Get all published projects
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      status,
      year,
      featured,
      search,
      page = '1',
      limit = '12',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filter
    const where: any = {
      publishedAt: { not: null },
    };

    if (category) {
      where.categories = {
        some: {
          slug: category as string,
        },
      };
    }

    if (status) {
      where.status = status as string;
    }

    if (year) {
      where.yearStart = parseInt(year as string);
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get projects
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          categories: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      data: projects,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PUBLIC: Get project by slug
export const getProjectBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        categories: true,
        relatedProjects: {
          include: {
            categories: true,
          },
          take: 3,
        },
      },
    });

    if (!project || !project.publishedAt) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({
      data: project,
      message: 'Project retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get all projects (including drafts)
export const getAdminProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        include: {
          categories: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.project.count(),
    ]);

    res.json({
      data: projects,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      location,
      city,
      country,
      yearStart,
      yearCompletion,
      status,
      client,
      projectSize,
      technicalSpecs,
      teamCredits,
      awards,
      isFeatured,
      categoryIds,
      publishedAt,
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !yearStart || !status) {
      res.status(400).json({ 
        message: 'Title, description, location, yearStart, and status are required' 
      });
      return;
    }

    // Generate slug
    let slug = generateSlug(title);
    
    // Ensure slug is unique
    let slugExists = await prisma.project.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await prisma.project.findUnique({ where: { slug } });
      counter++;
    }

    // Handle file uploads
    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const optimized = await optimizeImage(file.path);
          imageUrls.push(optimized.original);
        } catch (error) {
          console.error('Error optimizing image:', error);
        }
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        title,
        slug,
        description,
        location,
        city: city || null,
        country: country || null,
        yearStart: parseInt(yearStart),
        yearCompletion: yearCompletion ? parseInt(yearCompletion) : null,
        status,
        client: client || null,
        projectSize: projectSize || null,
        technicalSpecs: technicalSpecs ? JSON.parse(technicalSpecs) : null,
        teamCredits: teamCredits ? JSON.parse(teamCredits) : [],
        awards: awards ? JSON.parse(awards) : [],
        isFeatured: isFeatured === 'true' || isFeatured === true,
        images: imageUrls,
        featuredImage: imageUrls[0] || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        categories: categoryIds ? {
          connect: JSON.parse(categoryIds).map((id: string) => ({ id })),
        } : undefined,
      },
      include: {
        categories: true,
      },
    });

    res.status(201).json({
      data: project,
      message: 'Project created successfully',
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Project slug already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// ADMIN: Update project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      city,
      country,
      yearStart,
      yearCompletion,
      status,
      client,
      projectSize,
      technicalSpecs,
      teamCredits,
      awards,
      isFeatured,
      categoryIds,
      publishedAt,
      existingImages,
    } = req.body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Handle new file uploads
    const files = req.files as Express.Multer.File[];
    const newImageUrls: string[] = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const optimized = await optimizeImage(file.path);
          newImageUrls.push(optimized.original);
        } catch (error) {
          console.error('Error optimizing image:', error);
        }
      }
    }

    // Combine existing and new images
    const parsedExistingImages = existingImages ? JSON.parse(existingImages) : [];
    const allImages = [...parsedExistingImages, ...newImageUrls];

    // Delete removed images
    const removedImages = existingProject.images.filter(
      (img: string) => !parsedExistingImages.includes(img)
    );
    
    for (const imgPath of removedImages) {
      try {
        await deleteImage(imgPath);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Update project
    const updateData: any = {
      title,
      description,
      location,
      city: city || null,
      country: country || null,
      yearStart: yearStart ? parseInt(yearStart) : undefined,
      yearCompletion: yearCompletion ? parseInt(yearCompletion) : null,
      status,
      client: client || null,
      projectSize: projectSize || null,
      technicalSpecs: technicalSpecs ? JSON.parse(technicalSpecs) : null,
      teamCredits: teamCredits ? JSON.parse(teamCredits) : [],
      awards: awards ? JSON.parse(awards) : [],
      isFeatured: isFeatured === 'true' || isFeatured === true,
      images: allImages,
      featuredImage: allImages[0] || null,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    };

    // Handle categories
    if (categoryIds) {
      updateData.categories = {
        set: [],
        connect: JSON.parse(categoryIds).map((catId: string) => ({ id: catId })),
      };
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        categories: true,
      },
    });

    res.json({
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Delete project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Delete all associated images
    for (const imgPath of project.images) {
      try {
        await deleteImage(imgPath);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Delete project
    await prisma.project.delete({
      where: { id },
    });

    res.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

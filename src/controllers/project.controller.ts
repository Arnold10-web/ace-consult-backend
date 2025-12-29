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
    const take = Math.min(parseInt(limit as string), 50); // Max 50 items per page

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

    if (status && status !== 'published') {
      // Allow filtering by project status: completed, ongoing, competition
      where.status = status as string;
    }

    if (year) {
      const yearInt = parseInt(year as string);
      where.OR = [
        {
          startDate: {
            gte: new Date(`${yearInt}-01-01`),
            lt: new Date(`${yearInt + 1}-01-01`),
          },
        },
        {
          completionDate: {
            gte: new Date(`${yearInt}-01-01`),
            lt: new Date(`${yearInt + 1}-01-01`),
          },
        },
      ];
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

    // Get projects with optimized select
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          location: true,
          featuredImage: true,
          images: true,
          isFeatured: true,
          publishedAt: true,
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { publishedAt: 'desc' }
        ],
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
          where: {
            publishedAt: { not: null },
          },
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

    // If no manually related projects, find similar ones by category
    if (project.relatedProjects.length === 0) {
      const similarProjects = await prisma.project.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            { id: { not: project.id } },
            {
              categories: {
                some: {
                  id: {
                    in: project.categories.map(cat => cat.id),
                  },
                },
              },
            },
          ],
        },
        include: {
          categories: true,
        },
        take: 3,
        orderBy: {
          publishedAt: 'desc',
        },
      });
      
      // Add similar projects to the response
      project.relatedProjects = similarProjects as any;
    }

    // Track view asynchronously
    prisma.analytics.create({
      data: {
        type: 'project_view',
        resourceId: project.id,
        resourceType: 'project',
        path: `/projects/${slug}`,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      },
    }).catch(console.error);

    res.json({
      data: project,
      message: 'Project retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get project by ID (for editing)
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        categories: true,
      },
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({
      data: project,
      message: 'Project retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Delete individual image from project
export const deleteProjectImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      res.status(400).json({ message: 'Image URL is required' });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Check if image exists in project
    if (!project.images.includes(imageUrl)) {
      res.status(404).json({ message: 'Image not found in project' });
      return;
    }

    // Remove image from project images array
    const updatedImages = project.images.filter(img => img !== imageUrl);

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        images: updatedImages,
        featuredImage: updatedImages[0] || null, // Update featured image if deleted
      },
      include: {
        categories: true,
      },
    });

    // Delete image file from storage
    try {
      await deleteImage(imageUrl);
    } catch (error) {
      console.error('Error deleting image file:', error);
      // Continue even if file deletion fails
    }

    res.json({
      data: updatedProject,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project image:', error);
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
      startDate,
      completionDate,
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
    if (!title || !description || !location || !status) {
      res.status(400).json({ 
        message: 'Title, description, location, and status are required' 
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
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        status,
        client: client || null,
        projectSize: projectSize || null,
        technicalSpecs: technicalSpecs ? JSON.parse(technicalSpecs) : null,
        teamCredits: teamCredits ? JSON.parse(teamCredits) : [],
        awards: awards ? JSON.parse(awards) : [],
        isFeatured: isFeatured === 'true' || isFeatured === true,
        images: imageUrls,
        featuredImage: imageUrls[0] || null,
        publishedAt: status === 'published' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
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
      startDate,
      completionDate,
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
      startDate: startDate ? new Date(startDate) : undefined,
      completionDate: completionDate ? new Date(completionDate) : null,
      status,
      client: client || null,
      projectSize: projectSize || null,
      technicalSpecs: technicalSpecs ? JSON.parse(technicalSpecs) : null,
      teamCredits: teamCredits ? JSON.parse(teamCredits) : [],
      awards: awards ? JSON.parse(awards) : [],
      isFeatured: isFeatured === 'true' || isFeatured === true,
      images: allImages,
      featuredImage: allImages[0] || null,
      publishedAt: status === 'published' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
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

// ADMIN: Add related project
export const addRelatedProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { relatedProjectId } = req.body;

    if (!relatedProjectId) {
      res.status(400).json({ message: 'Related project ID is required' });
      return;
    }

    // Check if both projects exist
    const [project, relatedProject] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.project.findUnique({ where: { id: relatedProjectId } }),
    ]);

    if (!project || !relatedProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Add the relationship
    await prisma.project.update({
      where: { id },
      data: {
        relatedProjects: {
          connect: { id: relatedProjectId },
        },
      },
    });

    res.json({ message: 'Related project added successfully' });
  } catch (error) {
    console.error('Error adding related project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Remove related project
export const removeRelatedProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { relatedProjectId } = req.body;

    if (!relatedProjectId) {
      res.status(400).json({ message: 'Related project ID is required' });
      return;
    }

    await prisma.project.update({
      where: { id },
      data: {
        relatedProjects: {
          disconnect: { id: relatedProjectId },
        },
      },
    });

    res.json({ message: 'Related project removed successfully' });
  } catch (error) {
    console.error('Error removing related project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

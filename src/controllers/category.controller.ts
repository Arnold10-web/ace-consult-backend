import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// PUBLIC: Get all categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      data: categories,
      message: 'Categories retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    // Generate slug
    let slug = generateSlug(name);
    
    // Ensure slug is unique
    let slugExists = await prisma.category.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(name)}-${counter}`;
      slugExists = await prisma.category.findUnique({ where: { slug } });
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
      },
    });

    res.status(201).json({
      data: category,
      message: 'Category created successfully',
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Category name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// ADMIN: Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    // Generate new slug
    let slug = generateSlug(name);
    
    // Check if slug is taken by another category
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      let counter = 1;
      while (existing) {
        slug = `${generateSlug(name)}-${counter}`;
        const exists = await prisma.category.findUnique({ where: { slug } });
        if (!exists || exists.id === id) break;
        counter++;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
      },
    });

    res.json({
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// ADMIN: Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Category not found' });
    } else if ((error as any).code === 'P2003') {
      res.status(400).json({ 
        message: 'Cannot delete category with associated projects' 
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

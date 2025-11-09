import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// PUBLIC: Get all published articles
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', tag, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      publishedAt: { not: null },
    };

    if (tag) {
      where.tags = { has: tag as string };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      data: articles,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PUBLIC: Get article by slug
export const getArticleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: true,
      },
    });

    if (!article || !article.publishedAt) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    res.json({
      data: article,
      message: 'Article retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Get all articles
export const getAdminArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        include: {
          author: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.article.count(),
    ]);

    res.json({
      data: articles,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (error) {
    console.error('Error fetching admin articles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Create article
export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      authorId,
      tags,
      seoTitle,
      seoDescription,
      publishedAt,
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: 'Title and content are required' });
      return;
    }

    // Generate slug
    let slug = generateSlug(title);
    
    // Ensure slug is unique
    let slugExists = await prisma.article.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await prisma.article.findUnique({ where: { slug } });
      counter++;
    }

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImage || null,
        authorId: authorId || null,
        tags: tags || [],
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
      include: {
        author: true,
      },
    });

    res.status(201).json({
      data: article,
      message: 'Article created successfully',
    });
  } catch (error: any) {
    console.error('Error creating article:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ADMIN: Update article
export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      excerpt,
      content,
      featuredImage,
      authorId,
      tags,
      seoTitle,
      seoDescription,
      publishedAt,
    } = req.body;

    const article = await prisma.article.update({
      where: { id },
      data: {
        title,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImage || null,
        authorId: authorId || null,
        tags: tags || [],
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
      include: {
        author: true,
      },
    });

    res.json({
      data: article,
      message: 'Article updated successfully',
    });
  } catch (error) {
    console.error('Error updating article:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Article not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// ADMIN: Delete article
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.article.delete({
      where: { id },
    });

    res.json({
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Article not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

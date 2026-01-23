import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { deleteImage, processImage } from '../utils/simpleImageProcessor';

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
    const { page = '1', limit = '10', tag, search, featured } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    console.log('Articles request:', { page, limit, tag, search, featured }); // Debug log

    const where: any = {
      publishedAt: { not: null },
    };

    if (tag) {
      where.tags = { has: tag as string };
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    console.log('Query where clause:', JSON.stringify(where, null, 2)); // Debug log

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    console.log(`Found ${articles.length} articles out of ${total} total`); // Debug log

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
    });

    if (!article || !article.publishedAt) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    // Track view asynchronously
    prisma.analytics.create({
      data: {
        type: 'article_view',
        resourceId: article.id,
        resourceType: 'article',
        path: `/news/detail/${slug}`,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      },
    }).catch(console.error);

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

    console.log('Admin articles request received'); // Debug log

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.article.count(),
    ]);

    console.log(`Found ${articles.length} articles out of ${total} total`); // Debug log

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

// ADMIN: Get article by ID
export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: {
        id: id,
      },
    });

    if (!article) {
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

// ADMIN: Create article
export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      excerpt,
      content,
      tags,
      seoTitle,
      seoDescription,
      publishedAt,
      status,
      isFeatured,
    } = req.body;

    if (!title || !content) {
      console.log('Validation failed - missing required fields:', { title: !!title, content: !!content });
      res.status(400).json({ message: 'Title and content are required' });
      return;
    }

    // Handle featured image upload
    let featuredImagePath = null;
    if (req.file) {
      console.log('Processing uploaded file:', req.file.filename);
      try {
        const processed = await processImage(req.file.path);
        featuredImagePath = processed;
        console.log('Image optimization successful:', featuredImagePath);
      } catch (imageError) {
        console.error('Image optimization failed:', imageError);
        // Use the original file path as fallback
        featuredImagePath = req.file.path;
      }
    }

    // Generate slug
    let slug = generateSlug(title);
    console.log('Generated initial slug:', slug);
    
    // Ensure slug is unique
    let slugExists = await prisma.article.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      console.log(`Slug ${slug} exists, trying with counter ${counter}`);
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await prisma.article.findUnique({ where: { slug } });
      counter++;
      if (counter > 100) {
        console.error('Infinite loop protection: Too many slug conflicts');
        throw new Error('Unable to generate unique slug');
      }
    }
    console.log('Final unique slug:', slug);

    // Handle tags - convert string to array if needed
    let tagsArray = tags || [];
    if (typeof tags === 'string') {
      tagsArray = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }
    console.log('Processed tags:', tagsArray, 'type:', typeof tagsArray);

    // Determine publishedAt based on status
    const finalPublishedAt = status === 'published' ? new Date() : null;



    console.log('Article creation data:', {
      title,
      status,
      publishedAt,
      finalPublishedAt,
      isFeatured,
      isFeaturedBoolean: isFeatured === 'on' || isFeatured === 'true' || isFeatured === true || isFeatured === 1,
    }); // Debug log

    console.log('About to create article with data:', {
      title,
      slug,
      excerpt: excerpt || null,
      content: content?.substring(0, 100) + '...', // truncated for logging
      featuredImage: featuredImagePath,
      tags: tagsArray,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt: finalPublishedAt,
      isFeatured: isFeatured === 'on' || isFeatured === 'true' || isFeatured === true || isFeatured === 1,
    });

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImagePath,
        tags: tagsArray,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        status: status || 'draft', // Add status field
        publishedAt: finalPublishedAt,
        isFeatured: isFeatured === 'on' || isFeatured === 'true' || isFeatured === true || isFeatured === 1,
      },
    });

    res.status(201).json({
      data: article,
      message: 'Article created successfully',
    });
  } catch (error: any) {
    console.error('Error creating article:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
      tags,
      seoTitle,
      seoDescription,
      publishedAt,
      status,
      isFeatured,
      featured,
    } = req.body;

    // Handle tags - convert string to array if needed
    let tagsArray = tags || [];
    if (typeof tags === 'string') {
      tagsArray = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    // Get existing article first to check current state
    const existingArticle = await prisma.article.findUnique({
      where: { id }
    });

    if (!existingArticle) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    // Determine publishedAt based on status transition
    let finalPublishedAt;
    if (status === 'published' && !existingArticle.publishedAt) {
      // Publishing for the first time
      finalPublishedAt = new Date();
    } else if (status === 'published') {
      // Keep existing publishedAt if already published
      finalPublishedAt = existingArticle.publishedAt;
    } else {
      // Draft - remove publishedAt
      finalPublishedAt = null;
    }

    // Handle isFeatured (could come as 'featured' from form)
    const finalIsFeatured = isFeatured !== undefined ? isFeatured : featured;
    
    // Convert to boolean properly
    const isFeaturedBoolean = finalIsFeatured === 'on' || finalIsFeatured === 'true' || finalIsFeatured === true || finalIsFeatured === 1;

    console.log('Article update data:', {
      title,
      status,
      publishedAt,
      finalPublishedAt,
      finalIsFeatured,
      isFeaturedBoolean
    }); // Debug log

    const article = await prisma.article.update({
      where: { id },
      data: {
        title,
        excerpt: excerpt || null,
        content,
        featuredImage: (featuredImage && typeof featuredImage === 'string' && featuredImage.trim() !== '') ? featuredImage : null,
        tags: tagsArray,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        status: status || existingArticle.status, // Add status field
        publishedAt: finalPublishedAt,
        isFeatured: isFeaturedBoolean,
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

    // Get article to find associated images
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    // Delete associated images if they exist
    if (article.featuredImage) {
      try {
        await deleteImage(article.featuredImage);
      } catch (error) {
        console.error('Error deleting featured image:', error);
      }
    }

    // Delete article from database
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

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const trackView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, resourceId, resourceType, path } = req.body;
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    await prisma.analytics.create({
      data: {
        type,
        resourceId: resourceId || null,
        resourceType: resourceType || null,
        path,
        userAgent,
        ipAddress,
        createdAt: new Date(),
      },
    });

    res.json({ message: 'View tracked successfully' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDashboardAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalProjects,
      totalArticles,
      totalContacts
    ] = await Promise.all([
      prisma.project.count(),
      prisma.article.count(),
      prisma.contactSubmission.count()
    ]);

    res.json({
      totalProjects,
      totalArticles,
      totalContacts,
      publishedProjects: totalProjects,
      publishedArticles: totalArticles,
      unreadContacts: totalContacts,
      pageViews: 0,
      uniqueVisitors: 0,
      topPages: []
    });
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    res.json({
      totalProjects: 0,
      totalArticles: 0,
      totalContacts: 0,
      publishedProjects: 0,
      publishedArticles: 0,
      unreadContacts: 0,
      pageViews: 0,
      uniqueVisitors: 0,
      topPages: []
    });
  }
};

export const trackClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, resourceId, resourceType, path = '' } = req.body;
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    await prisma.analytics.create({
      data: {
        type,
        resourceId: resourceId || null,
        resourceType: resourceType || null,
        path,
        userAgent,
        ipAddress,
        createdAt: new Date(),
      },
    });

    res.json({ message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getResourceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    
    const totalViews = await prisma.analytics.count({
      where: {
        type: `${type}_view`,
        resourceId: id,
      },
    });

    res.json({
      totalViews,
      message: 'Resource analytics retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching resource analytics:', error);
    res.json({
      totalViews: 0,
      message: 'Analytics not available',
    });
  }
};
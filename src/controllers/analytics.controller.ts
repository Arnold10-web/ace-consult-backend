import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track page/resource views
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
      },
    });

    res.status(201).json({ message: 'View tracked successfully' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get analytics dashboard data
export const getDashboardAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      // Total counts
      totalProjects,
      totalArticles,
      totalContacts,
      
      // Published counts
      publishedProjects,
      publishedArticles,
      
      // Contact stats
      unreadContacts,
      
      // Views in last 30 days
      recentViews,
      
      // Popular projects
      popularProjects,
      
      // Popular articles
      popularArticles,
      
      // Daily views for chart (last 14 days)
      dailyViews,
      
      // Monthly stats
      monthlyStats,
    ] = await Promise.all([
      // Basic counts
      prisma.project.count(),
      prisma.article.count(),
      prisma.contactSubmission.count(),
      
      // Published content
      prisma.project.count({ where: { status: 'published' } }),
      prisma.article.count({ where: { publishedAt: { not: null } } }),
      
      // Unread contacts
      prisma.contactSubmission.count({ where: { isRead: false } }),
      
      // Recent views (last 30 days)
      prisma.analytics.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Popular projects (by views)
      prisma.analytics.groupBy({
        by: ['resourceId'],
        where: {
          type: 'project_view',
          resourceId: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          resourceId: true,
        },
        orderBy: {
          _count: {
            resourceId: 'desc',
          },
        },
        take: 5,
      }),
      
      // Popular articles (by views)
      prisma.analytics.groupBy({
        by: ['resourceId'],
        where: {
          type: 'article_view',
          resourceId: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          resourceId: true,
        },
        orderBy: {
          _count: {
            resourceId: 'desc',
          },
        },
        take: 5,
      }),
      
      // Daily views for chart (last 14 days)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as views
        FROM "Analytics" 
        WHERE "createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // Monthly content creation
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          'projects' as type,
          COUNT(*) as count
        FROM "Project"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          'articles' as type,
          COUNT(*) as count
        FROM "Article"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        
        ORDER BY month DESC
      `,
    ]);

    // Get project details for popular projects
    const popularProjectDetails = await Promise.all(
      popularProjects.map(async (item: any) => {
        const project = await prisma.project.findUnique({
          where: { id: item.resourceId },
          select: { id: true, title: true, slug: true, featuredImage: true },
        });
        return {
          ...project,
          views: item._count.resourceId,
        };
      })
    );

    // Get article details for popular articles
    const popularArticleDetails = await Promise.all(
      popularArticles.map(async (item: any) => {
        const article = await prisma.article.findUnique({
          where: { id: item.resourceId },
          select: { id: true, title: true, slug: true, featuredImage: true },
        });
        return {
          ...article,
          views: item._count.resourceId,
        };
      })
    );

    res.json({
      data: {
        totals: {
          projects: totalProjects,
          articles: totalArticles,
          contacts: totalContacts,
          publishedProjects,
          publishedArticles,
          unreadContacts,
          recentViews,
        },
        popularProjects: popularProjectDetails.filter(Boolean),
        popularArticles: popularArticleDetails.filter(Boolean),
        dailyViews,
        monthlyStats,
      },
      message: 'Analytics data retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get detailed analytics for a specific resource
export const getResourceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    const { timeframe = '30d' } = req.query;
    
    let startDate: Date;
    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [totalViews, dailyBreakdown] = await Promise.all([
      prisma.analytics.count({
        where: {
          type: `${type}_view`,
          resourceId: id,
          createdAt: { gte: startDate },
        },
      }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as views
        FROM "Analytics" 
        WHERE type = ${`${type}_view`}
        AND "resourceId" = ${id}
        AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    res.json({
      data: {
        totalViews,
        dailyBreakdown,
      },
      message: 'Resource analytics retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching resource analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
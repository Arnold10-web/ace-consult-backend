import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import {
  compressionMiddleware,
  securityMiddleware,
  rateLimitMiddleware,
  apiRateLimitMiddleware,
  cacheMiddleware,
  performanceMiddleware
} from './middleware/performance.middleware';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import articleRoutes from './routes/article.routes';
import teamRoutes from './routes/team.routes';
import mediaRoutes from './routes/media.routes';
import settingsRoutes from './routes/settings.routes';
import contactRoutes from './routes/contact.routes';
import categoryRoutes from './routes/category.routes';
import serviceRoutes from './routes/service.routes';
import analyticsRoutes from './routes/analytics.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Performance and Security Middleware
app.use(compressionMiddleware);
app.use(securityMiddleware);
app.use(performanceMiddleware);
app.use(rateLimitMiddleware);

// Basic Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://aceconsultltd.com',
    'https://www.aceconsultltd.com',
    'http://aceconsultltd.com',
    'http://www.aceconsultltd.com',
    'https://cpanel.aceconsultltd.com',
    'https://*.aceconsultltd.com',
    FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
// Use Railway volume path in production, local uploads in development
let UPLOAD_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.UPLOAD_DIR || '/app/uploads')
  : path.join(__dirname, '../uploads');

// Fallback: try to find the mounted volume directory in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const possiblePaths = [
    process.env.UPLOAD_DIR,
    '/app/uploads',
    '/uploads',
    '/mnt/uploads',
    '/app/ace-consult-backend-volume'
  ].filter((path): path is string => Boolean(path));
  
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        UPLOAD_DIR = testPath;
        console.log(`Found upload directory at: ${testPath}`);
        break;
      }
    } catch (e) {
      // Continue checking
    }
  }
}

console.log(`Upload directory: ${UPLOAD_DIR}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`UPLOAD_DIR env var: ${process.env.UPLOAD_DIR}`);

// Static file serving with comprehensive CORS and CORP headers
app.use('/uploads', (_req, res, next) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Cross-Origin-Resource-Policy header to allow cross-origin access
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Additional security headers for media files
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Performance headers for faster loading
  res.header('Vary', 'Accept, Accept-Encoding');
  
  // Cache headers for images - reasonable caching for performance vs freshness balance
  const cacheTime = process.env.NODE_ENV === 'production' ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days prod, 1 day dev
  res.header('Cache-Control', `public, max-age=${cacheTime}`);
  res.header('Expires', new Date(Date.now() + (cacheTime * 1000)).toUTCString());
  res.header('ETag', `W/"${Date.now()}"`); // Weak ETag for conditional requests
  
  next();
}, express.static(UPLOAD_DIR, {
  setHeaders: (res, path) => {
    // Set proper content type for images
    if (path.match(/\.(jpg|jpeg|png|webp)$/i)) {
      const ext = path.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          res.setHeader('Content-Type', 'image/jpeg');
          break;
        case 'png':
          res.setHeader('Content-Type', 'image/png');
          break;
        case 'webp':
          res.setHeader('Content-Type', 'image/webp');
          break;
      }
    }
  }
}));

// Handle OPTIONS requests for uploads specifically
app.options('/uploads/*', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendStatus(200);
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Database test endpoint
app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const projectCount = await prisma.project.count();
    const articleCount = await prisma.article.count();
    
    await prisma.$disconnect();
    
    res.json({
      status: 'database connected',
      counts: {
        projects: projectCount,
        articles: articleCount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'database error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// API Routes with rate limiting
app.use('/api', apiRateLimitMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes); // Remove caching for now
app.use('/api/articles', articleRoutes); // Remove caching for now
app.use('/api/team', cacheMiddleware(600), teamRoutes); // 10 min cache
app.use('/api/media', mediaRoutes);
app.use('/api/settings', cacheMiddleware(3600), settingsRoutes); // 1 hour cache
app.use('/api/contact', contactRoutes);
app.use('/api/categories', cacheMiddleware(1800), categoryRoutes); // 30 min cache
app.use('/api/services', cacheMiddleware(600), serviceRoutes); // 10 min cache
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

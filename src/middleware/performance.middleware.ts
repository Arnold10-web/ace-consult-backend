import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Compression middleware
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// Security headers with proper image serving support
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https:'],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access to resources
  crossOriginEmbedderPolicy: false, // Disable COEP to allow image embedding
});

// Rate limiting with proper proxy trust
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Get the IP using proper headers with fallback
    const ip = req.headers['x-forwarded-for'] as string ||
               req.headers['x-real-ip'] as string ||
               req.connection.remoteAddress ||
               req.ip ||
               'unknown';
    
    // Use ipKeyGenerator to properly handle IPv6
    return ipKeyGenerator(ip);
  },
});

// API-specific rate limiting (stricter)
export const apiRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'API rate limit exceeded, please try again later.',
  keyGenerator: (req: Request) => {
    // Get the IP using proper headers with fallback
    const ip = req.headers['x-forwarded-for'] as string ||
               req.headers['x-real-ip'] as string ||
               req.connection.remoteAddress ||
               req.ip ||
               'unknown';
    
    // Use ipKeyGenerator to properly handle IPv6
    return ipKeyGenerator(ip);
  },
});

// Response caching middleware
export const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Set cache headers
    res.set('Cache-Control', `public, max-age=${duration}`);
    res.set('ETag', req.url);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === req.url) {
      return res.status(304).end();
    }
    
    next();
  };
};

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};
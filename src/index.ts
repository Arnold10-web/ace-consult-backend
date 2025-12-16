import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import articleRoutes from './routes/article.routes';
import teamRoutes from './routes/team.routes';
import mediaRoutes from './routes/media.routes';
import settingsRoutes from './routes/settings.routes';
import contactRoutes from './routes/contact.routes';
import categoryRoutes from './routes/category.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://aceconsultltd.com',
    'https://www.aceconsultltd.com',
    FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
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

app.use('/uploads', express.static(UPLOAD_DIR));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/categories', categoryRoutes);

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

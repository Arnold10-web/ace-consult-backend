import { Router } from 'express';
import {
  getProjects,
  getProjectBySlug,
  getAdminProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  deleteProjectImage,
} from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/', getProjects);
router.get('/:slug', getProjectBySlug);

// Admin routes (protected)
router.get('/admin/all', authMiddleware, getAdminProjects);
router.get('/admin/:id', authMiddleware, getProjectById);
router.post('/admin', authMiddleware, upload.array('images', 20), createProject);
router.put('/admin/:id', authMiddleware, upload.array('images', 20), updateProject);
router.delete('/admin/:id', authMiddleware, deleteProject);
router.delete('/admin/:id/image', authMiddleware, deleteProjectImage);

export default router;

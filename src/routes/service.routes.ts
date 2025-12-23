import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getServices,
  getAdminServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// PUBLIC routes
router.get('/', getServices);

// ADMIN routes (protected)
router.get('/admin', authMiddleware, getAdminServices);
router.get('/:id', authMiddleware, getServiceById);
router.post(
  '/',
  authenticateToken,
  createService
);
router.put(
  '/:id',
  authenticateToken,
  updateService
);
router.delete('/:id', authenticateToken, deleteService);

export default router;
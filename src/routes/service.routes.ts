import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getServices,
  getAdminServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller';

const router = Router();

// PUBLIC routes
router.get('/', getServices);

// ADMIN routes (protected)
router.get('/admin', authenticateToken, getAdminServices);
router.get('/:id', authenticateToken, getServiceById);
router.post(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  createService
);
router.put(
  '/:id',
  authenticateToken,
  upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  updateService
);
router.delete('/:id', authenticateToken, deleteService);

export default router;
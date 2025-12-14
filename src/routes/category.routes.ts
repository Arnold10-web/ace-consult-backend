import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
router.get('/', getCategories);

// Admin routes (protected)
router.post('/admin', authMiddleware, createCategory);
router.put('/admin/:id', authMiddleware, updateCategory);
router.delete('/admin/:id', authMiddleware, deleteCategory);

export default router;

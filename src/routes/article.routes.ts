import { Router } from 'express';
import {
  getArticles,
  getArticleBySlug,
  getAdminArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../controllers/article.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getArticles);
router.get('/:slug', getArticleBySlug);

// Admin routes (protected)
router.get('/admin/all', authMiddleware, getAdminArticles);
router.get('/admin/:id', authMiddleware, getArticleById);
router.post('/admin', authMiddleware, createArticle);
router.put('/admin/:id', authMiddleware, updateArticle);
router.delete('/admin/:id', authMiddleware, deleteArticle);

export default router;

import { Router } from 'express';
import { trackView, getDashboardAnalytics, getResourceAnalytics } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route for tracking views
router.post('/track', trackView);

// Admin routes (protected)
router.get('/dashboard', authMiddleware, getDashboardAnalytics);
router.get('/resource/:type/:id', authMiddleware, getResourceAnalytics);

export default router;
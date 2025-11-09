import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
router.get('/', getSettings);

// Admin route (protected)
router.put('/admin', authMiddleware, updateSettings);

export default router;

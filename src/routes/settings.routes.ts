import { Router } from 'express';
import { getSettings, updateSettings, changePassword } from '../controllers/settings.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public route
router.get('/', getSettings);

// Admin routes (protected)
router.put('/admin', authenticateToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'heroImages', maxCount: 5 }
]), updateSettings);
router.post('/change-password', authenticateToken, changePassword);

export default router;

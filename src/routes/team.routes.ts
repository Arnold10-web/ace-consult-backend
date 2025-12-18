import { Router } from 'express';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/team.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public route
router.get('/', getTeamMembers);

// Admin routes (protected)
router.post('/admin', authMiddleware, upload.single('image'), createTeamMember);
router.put('/admin/:id', authMiddleware, upload.single('image'), updateTeamMember);
router.delete('/admin/:id', authMiddleware, deleteTeamMember);

export default router;

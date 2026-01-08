import { Router } from 'express';
import {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/team.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/', getTeamMembers);
router.get('/:id', getTeamMemberById);

// Admin routes (protected)
router.post('/admin', authMiddleware, upload.single('photo'), createTeamMember);
router.put('/admin/:id', authMiddleware, upload.single('photo'), updateTeamMember);
router.delete('/admin/:id', authMiddleware, deleteTeamMember);

export default router;

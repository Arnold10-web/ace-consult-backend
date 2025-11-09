import { Router } from 'express';
import {
  submitContact,
  getContactSubmissions,
  markAsRead,
  deleteContactSubmission,
} from '../controllers/contact.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
router.post('/submit', submitContact);

// Admin routes (protected)
router.get('/admin', authMiddleware, getContactSubmissions);
router.put('/admin/:id/read', authMiddleware, markAsRead);
router.delete('/admin/:id', authMiddleware, deleteContactSubmission);

export default router;

import { Router } from 'express';
import { uploadMedia, getAllMedia, deleteMedia } from '../controllers/media.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All routes are protected (admin only)
router.post('/upload', authMiddleware, upload.array('files', 20), uploadMedia);
router.get('/', authMiddleware, getAllMedia);
router.delete('/:id', authMiddleware, deleteMedia);

export default router;

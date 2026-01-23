import { Router } from 'express';
import { createInitialAdmin } from '../controllers/setup.controller';

const router = Router();

// POST /api/setup/admin - Create initial admin user (only if no admin exists)
router.post('/admin', createInitialAdmin);

export default router;
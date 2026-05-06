import { Router } from 'express';
import { getMe, updateMe, changePassword } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/me — get current user profile + stats
router.get('/me', authenticate, getMe);

// PATCH /api/users/me — update profile (name, phone, address)
router.patch('/me', authenticate, updateMe);

// PATCH /api/users/me/change-password
router.patch('/me/change-password', authenticate, changePassword);

export default router;

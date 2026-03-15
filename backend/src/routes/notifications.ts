import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// @route   GET /api/notifications
// @desc    Get user notifications
router.get('/', notificationController.getNotifications);

// @route   PATCH /api/notifications/read
// @desc    Mark all notifications as read
router.patch('/read', notificationController.markAllRead);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

export default router;

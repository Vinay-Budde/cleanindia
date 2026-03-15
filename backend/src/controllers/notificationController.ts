import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { ApiResponse } from '../utils/ApiResponse';

export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.user;
        const notifications = await NotificationService.getNotifications(email, role);
        return ApiResponse.success(res, notifications);
    } catch (error) {
        next(error);
    }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id as string);
        return ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (error) {
        next(error);
    }
};

export const markAllRead = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.user;
        await NotificationService.markAllRead(email, role);
        return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (error) {
        next(error);
    }
};

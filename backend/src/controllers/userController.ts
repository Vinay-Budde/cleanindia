import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Complaint } from '../models/Complaint';
import { ApiResponse } from '../utils/ApiResponse';

// GET /api/users/me — return authenticated user's profile + complaint stats
export const getMe = async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash -otpCode -otpExpires -resetPasswordToken -resetPasswordExpires');
        if (!user) return ApiResponse.error(res, 'User not found', 404);

        // Fetch complaint stats for the user
        const complaints = await Complaint.find({ reportedBy: user.email });
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        const pending = complaints.filter(c => ['submitted', 'verified', 'assigned', 'in progress'].includes(c.status)).length;

        // Most recent 5 complaints for activity feed
        const recentComplaints = complaints
            .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
            .slice(0, 5)
            .map(c => ({
                _id: c._id,
                complaintId: c.complaintId,
                title: c.title,
                category: c.category,
                status: c.status,
                priority: c.priority,
                location: c.location,
                imageUrl: c.imageUrl,
                reportedAt: c.reportedAt,
            }));

        return ApiResponse.success(res, {
            user,
            stats: {
                total: complaints.length,
                resolved,
                pending,
            },
            recentComplaints,
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/me — update name, phone, address
export const updateMe = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { name, phone, address } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return ApiResponse.error(res, 'User not found', 404);

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address !== undefined) (user as any).address = address;

        await user.save();

        return ApiResponse.success(res, {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
        }, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/me/change-password
export const changePassword = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return ApiResponse.error(res, 'Current password and new password are required', 400);
        }

        if (newPassword.length < 6) {
            return ApiResponse.error(res, 'New password must be at least 6 characters', 400);
        }

        const user = await User.findById(req.user.id);
        if (!user) return ApiResponse.error(res, 'User not found', 404);

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return ApiResponse.error(res, 'Current password is incorrect', 400);
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

import { Request, Response, NextFunction } from 'express';
import { ComplaintService } from '../services/complaintService';
import { ApiResponse } from '../utils/ApiResponse';

export const createComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        // SECURITY: Always use the authenticated user's email as reportedBy — never trust body
        const reportedBy = req.user?.email || 'Anonymous';
        const complaint = await ComplaintService.createComplaint({ ...req.body, reportedBy }, req.file);
        return ApiResponse.success(res, complaint, 'Complaint submitted successfully', 201);
    } catch (error) {
        next(error);
    }
};

export const getComplaints = async (req: any, res: Response, next: NextFunction) => {
    try {
        // Admins see all complaints; citizens see only their own
        const complaints = await ComplaintService.getAllComplaints(req.query, req.user);
        return ApiResponse.success(res, complaints);
    } catch (error) {
        next(error);
    }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const complaint = await ComplaintService.updateStatus(req.params.id as string, req.body, req.file);
        return ApiResponse.success(res, complaint, 'Status updated successfully');
    } catch (error) {
        next(error);
    }
};

export const assignComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { assignedTo } = req.body;
        // Use the logged-in admin's name/email as adminName
        const adminName = req.user?.name || req.user?.email || req.body.adminName || 'Admin';
        const complaint = await ComplaintService.assignComplaint(req.params.id as string, assignedTo, adminName);
        return ApiResponse.success(res, complaint, 'Complaint assigned successfully');
    } catch (error) {
        next(error);
    }
};

import { Request, Response, NextFunction } from 'express';
import { ComplaintService } from '../services/complaintService';
import { ApiResponse } from '../utils/ApiResponse';
import { SLAService } from '../services/slaService';

export const createComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const reportedBy = req.user?.email || 'Anonymous';
        const complaint = await ComplaintService.createComplaint({ ...req.body, reportedBy }, req.file);
        return ApiResponse.success(res, complaint, 'Complaint submitted successfully', 201);
    } catch (error: any) {
        if (error.message === 'DUPLICATE_DETECTED') {
            return res.status(409).json({
                success: false,
                message: 'This issue has already been reported nearby.',
                isDuplicate: true,
                existingComplaint: error.existingComplaint,
            });
        }
        next(error);
    }
};

export const getComplaints = async (req: any, res: Response, next: NextFunction) => {
    try {
        const result = await ComplaintService.getAllComplaints(req.query, req.user);
        return ApiResponse.success(res, result);
    } catch (error) { next(error); }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const complaint = await ComplaintService.updateStatus(String(req.params.id), req.body, req.file);
        return ApiResponse.success(res, complaint, 'Status updated successfully');
    } catch (error) { next(error); }
};

export const assignComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { assignedTo } = req.body;
        const adminName = req.user?.name || req.user?.email || 'Admin';
        const complaint = await ComplaintService.assignComplaint(String(req.params.id), assignedTo, adminName);
        return ApiResponse.success(res, complaint, 'Complaint assigned successfully');
    } catch (error) { next(error); }
};

export const rateComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const complaint = await ComplaintService.rateComplaint(String(req.params.id), req.user.id, req.body);
        return ApiResponse.success(res, complaint, 'Rating submitted');
    } catch (error) { next(error); }
};

export const supportComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const result = await ComplaintService.supportComplaint(String(req.params.id), req.user.id);
        return ApiResponse.success(res, result, 'Joined complaint');
    } catch (error) { next(error); }
};

export const getTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await ComplaintService.getTimeline(String(req.params.id));
        return ApiResponse.success(res, data);
    } catch (error) { next(error); }
};

export const triggerSLACheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const breached = await SLAService.checkAndMarkBreaches();
        return ApiResponse.success(res, { breached }, `Marked ${breached} complaints as SLA breached`);
    } catch (error) { next(error); }
};

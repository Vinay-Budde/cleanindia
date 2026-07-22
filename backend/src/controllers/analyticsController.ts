import { Request, Response, NextFunction } from 'express';
import { Complaint } from '../models/Complaint';
import { ApiResponse } from '../utils/ApiResponse';

export const getOverallStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [total, byStatus, byPriority, byCategory, slaStats] = await Promise.all([
            Complaint.countDocuments(),
            Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
            Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
            Complaint.aggregate([{ $group: { _id: null, totalSLA: { $sum: { $cond: ['$slaDeadline', 1, 0] } }, breached: { $sum: { $cond: ['$slaBreached', 1, 0] } } } }]),
        ]);
        return ApiResponse.success(res, { total, byStatus, byPriority, byCategory, slaStats: slaStats[0] || {} });
    } catch (error) { next(error); }
};

export const getMonthlyTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const trends = await Complaint.aggregate([
            { $group: { _id: { year: { $year: '$reportedAt' }, month: { $month: '$reportedAt' } }, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }, slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } } } },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 },
        ]);
        return ApiResponse.success(res, trends);
    } catch (error) { next(error); }
};

export const getMunicipalityStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await Complaint.aggregate([
            { $match: { assignedMunicipality: { $exists: true, $ne: null } } },
            { $group: { _id: '$assignedMunicipality', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved','closed']] }, 1, 0] } }, pending: { $sum: { $cond: [{ $in: ['$status', ['submitted','verified','assigned']] }, 1, 0] } }, slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } }, avgRating: { $avg: '$rating.stars' } } },
            { $lookup: { from: 'municipalcorporations', localField: '_id', foreignField: '_id', as: 'mc' } },
            { $unwind: { path: '$mc', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$mc.name', district: '$mc.district', state: '$mc.state', total: 1, resolved: 1, pending: 1, slaBreached: 1, avgRating: 1 } },
            { $sort: { total: -1 } },
        ]);
        return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
};

export const getResolutionTime = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await Complaint.aggregate([
            { $match: { status: { $in: ['resolved','closed'] }, resolvedAt: { $exists: true } } },
            { $group: { _id: '$category', avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$reportedAt'] }, 3600000] } }, count: { $sum: 1 } } },
            { $sort: { avgHours: 1 } },
        ]);
        return ApiResponse.success(res, data);
    } catch (error) { next(error); }
};

export const getHeatmapData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await Complaint.find({ latitude: { $exists: true }, longitude: { $exists: true } }, 'latitude longitude priority category status').limit(2000).lean();
        return ApiResponse.success(res, data);
    } catch (error) { next(error); }
};

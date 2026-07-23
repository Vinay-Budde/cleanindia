import { Request, Response, NextFunction } from 'express';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
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
        const { category, priority } = (req as any).query;
        const match: any = { latitude: { $exists: true }, longitude: { $exists: true } };
        if (category) match.category = category;
        if (priority) match.priority = priority;
        const data = await Complaint.find(match, 'latitude longitude priority category status severityScore').limit(2000).lean();
        return ApiResponse.success(res, data);
    } catch (error) { next(error); }
};

// Predictive Analytics - seasonal patterns
export const getPredictiveAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get complaints by month+category to find seasonal patterns
        const patterns = await Complaint.aggregate([
            { $group: {
                _id: { month: { $month: '$reportedAt' }, category: '$category' },
                count: { $sum: 1 },
                avgResolutionHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$reportedAt'] }, 3600000] } }
            }},
            { $sort: { count: -1 } },
        ]);

        // Current month stats
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const thisMonthPatterns = patterns.filter((p: any) => p._id.month === currentMonth);

        // Build predictions: same month last year patterns
        const predictions = thisMonthPatterns.slice(0, 5).map((p: any) => {
            const historicalAvg = patterns
                .filter((x: any) => x._id.category === p._id.category)
                .reduce((acc: any, x: any) => acc + x.count, 0) / 12;
            return {
                category: p._id.category,
                expectedComplaints: Math.round(historicalAvg * 1.1),
                currentCount: p.count,
                trend: p.count > historicalAvg ? 'increasing' : 'normal',
                recommendation: p.count > historicalAvg * 1.5
                    ? `Deploy extra team for ${p._id.category} this month`
                    : `Standard allocation sufficient for ${p._id.category}`
            };
        });

        // Category hotspot analysis
        const categoryTotals = await Complaint.aggregate([
            { $group: { _id: '$category', total: { $sum: 1 }, emergency: { $sum: { $cond: [{ $eq: ['$priority', 'emergency'] }, 1, 0] } } } },
            { $sort: { total: -1 } }
        ]);

        return ApiResponse.success(res, { predictions, categoryTotals, patterns: patterns.slice(0, 50) });
    } catch (error) { next(error); }
};

// Officer Performance Scores
export const getOfficerPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const performanceData = await Complaint.aggregate([
            { $match: { assignedOfficer: { $exists: true, $ne: null } } },
            { $group: {
                _id: '$assignedOfficer',
                total: { $sum: 1 },
                resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved','closed']] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $in: ['$status', ['in_progress','accepted']] }, 1, 0] } },
                breached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
                reopened: { $sum: { $cond: [{ $eq: ['$status', 'reopened'] }, 1, 0] } },
                avgRating: { $avg: '$rating.stars' },
                avgResolutionHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$reportedAt'] }, 3600000] } }
            }},
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
            { $unwind: { path: '$officer', preserveNullAndEmptyArrays: true } },
            { $addFields: {
                resolutionRate: { $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 100] },
                slaCompliance: { $multiply: [{ $divide: [{ $subtract: ['$total', '$breached'] }, { $max: ['$total', 1] }] }, 100] },
                performanceScore: {
                    $subtract: [
                        { $add: [
                            { $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 60] },
                            { $multiply: [{ $ifNull: ['$avgRating', 3] }, 6] },
                            { $multiply: [{ $divide: [{ $subtract: ['$total', '$breached'] }, { $max: ['$total', 1] }] }, 20] }
                        ]},
                        { $multiply: [{ $divide: ['$reopened', { $max: ['$total', 1] }] }, 20] }
                    ]
                }
            }},
            { $sort: { performanceScore: -1 } },
            { $limit: 50 }
        ]);
        return ApiResponse.success(res, performanceData);
    } catch (error) { next(error); }
};

// Ward-level Smart Recommendations
export const getWardRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const wardStats = await Complaint.aggregate([
            { $match: { assignedWard: { $exists: true } } },
            { $group: {
                _id: { ward: '$assignedWard', category: '$category' },
                count: { $sum: 1 },
                avgSeverity: { $avg: '$severityScore' }
            }},
            { $sort: { count: -1 } },
            { $group: {
                _id: '$_id.ward',
                topCategories: { $push: { category: '$_id.category', count: '$count', avgSeverity: '$avgSeverity' } },
                totalComplaints: { $sum: '$count' }
            }},
            { $lookup: { from: 'wards', localField: '_id', foreignField: '_id', as: 'ward' } },
            { $unwind: { path: '$ward', preserveNullAndEmptyArrays: true } },
            { $limit: 20 }
        ]);

        const recommendations = wardStats.map((w: any) => {
            const top = w.topCategories?.[0];
            const recs: string[] = [];
            if (top?.count > 20 && top?.category === 'Garbage') recs.push('Install additional dustbins in this ward');
            if (top?.count > 15 && top?.category === 'Potholes') recs.push('Schedule road repair drive');
            if (top?.count > 10 && top?.category === 'Street Lights') recs.push('Upgrade street lighting infrastructure');
            if (top?.count > 10 && top?.category === 'Drainage') recs.push('Inspect and clean drainage network');
            if (w.totalComplaints > 50) recs.push('Deploy additional field inspectors to this ward');
            return {
                wardId: w._id,
                wardName: w.ward?.name || 'Unknown Ward',
                totalComplaints: w.totalComplaints,
                topCategories: w.topCategories?.slice(0, 3),
                recommendations: recs.length > 0 ? recs : ['Current resource allocation is adequate']
            };
        });

        return ApiResponse.success(res, recommendations);
    } catch (error) { next(error); }
};

// Complaint Heatmap by category
export const getCategoryHeatmap = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category } = (req as any).query;
        const match: any = { latitude: { $exists: true }, longitude: { $exists: true } };
        if (category && category !== 'all') match.category = category;
        const data = await Complaint.aggregate([
            { $match: match },
            { $group: {
                _id: { lat: { $round: ['$latitude', 3] }, lng: { $round: ['$longitude', 3] } },
                count: { $sum: 1 },
                avgSeverity: { $avg: '$severityScore' },
                categories: { $addToSet: '$category' }
            }},
            { $project: { lat: '$_id.lat', lng: '$_id.lng', intensity: '$count', avgSeverity: 1 } },
            { $limit: 3000 }
        ]);
        return ApiResponse.success(res, data);
    } catch (error) { next(error); }
};


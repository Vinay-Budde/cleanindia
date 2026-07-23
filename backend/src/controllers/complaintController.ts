import { Request, Response, NextFunction } from 'express';
import { ComplaintService } from '../services/complaintService';
import { ApiResponse } from '../utils/ApiResponse';
import { SLAService } from '../services/slaService';
import { AIService } from '../services/aiService';
import { SeverityService } from '../services/severityService';
import { WeatherService } from '../services/weatherService';
import { RouteService } from '../services/routeService';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import mongoose from 'mongoose';
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

export const analyzeComplaintAI = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { title, description, category, latitude, longitude } = req.body;
        const analysis = await AIService.analyzeComplaint(title || '', description || '', category);
        let nearbyInfrastructure: string[] = [];
        let weatherAlert: string | null = null;
        let severityScore = 3;
        
        if (latitude && longitude) {
            const [infraRes, weatherRes] = await Promise.all([
                SeverityService.calculateInfrastructureSeverity(parseFloat(latitude), parseFloat(longitude), category || analysis.category),
                WeatherService.checkWeatherImpact(parseFloat(latitude), parseFloat(longitude), category || analysis.category)
            ]);
            nearbyInfrastructure = infraRes.pois;
            severityScore = infraRes.score;
            weatherAlert = weatherRes.alertType;
            if (weatherRes.priorityBump) severityScore += 2;
        }

        return ApiResponse.success(res, { ...analysis, nearbyInfrastructure, weatherAlert, severityScore });
    } catch (error) { next(error); }
};

export const getPublicFeed = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { lat, lng, radius = 5000, page = 1, limit = 20 } = req.query;
        let query: any = { status: { $nin: ['closed'] } };
        if (lat && lng) {
            query.geoPoint = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(String(lng)), parseFloat(String(lat))] },
                    $maxDistance: parseInt(String(radius))
                }
            };
        }
        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));
        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .select('complaintId title category priority status location reportedAt supportCount verificationCount nearbyInfrastructure severityScore geoPoint imageUrl isEmergency')
                .populate('assignedMunicipality', 'name')
                .sort({ priorityScore: -1, reportedAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Complaint.countDocuments(query)
        ]);
        return ApiResponse.success(res, { complaints, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } catch (error) { next(error); }
};

export const verifyComplaint = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return ApiResponse.error(res, 'Complaint not found', 404);
        if (complaint.verifiedByCitizens?.some((id: any) => id.equals(userId))) {
            return ApiResponse.error(res, 'Already verified by you', 400);
        }
        complaint.verifiedByCitizens = complaint.verifiedByCitizens || [];
        complaint.verifiedByCitizens.push(userId as any);
        complaint.verificationCount = (complaint.verificationCount || 0) + 1;
        // Auto-escalate priority if 5+ citizens verified
        if (complaint.verificationCount >= 5 && complaint.priority === 'medium') {
            complaint.priority = 'high';
            complaint.timeline.push({ action: 'community_verified_priority_escalated', by: 'System', role: 'system', comment: `${complaint.verificationCount} citizens verified this issue. Priority escalated.`, at: new Date() });
        }
        await complaint.save();
        return ApiResponse.success(res, { verificationCount: complaint.verificationCount, priority: complaint.priority }, 'Complaint verified');
    } catch (error) { next(error); }
};

export const getOfficerRoute = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { officerLat, officerLng, limit = 15 } = req.query;
        if (!officerLat || !officerLng) return ApiResponse.error(res, 'Officer location required', 400);
        const route = await RouteService.getOptimizedRoute(
            req.user.id,
            parseFloat(String(officerLat)),
            parseFloat(String(officerLng))
        );
        return ApiResponse.success(res, route);
    } catch (error) { next(error); }
};

export const updateOfficerLocation = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { latitude, longitude } = req.body;
        await User.findByIdAndUpdate(req.user.id, {
            $set: { lastLocation: { lat: latitude, lng: longitude, updatedAt: new Date() } }
        });
        return ApiResponse.success(res, { updated: true });
    } catch (error) { next(error); }
};

export const getLeaderboard = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { type = 'municipality' } = req.query;

        if (type === 'municipality') {
            const data = await Complaint.aggregate([
                { $match: { assignedMunicipality: { $exists: true } } },
                { $group: {
                    _id: '$assignedMunicipality',
                    total: { $sum: 1 },
                    resolved: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                    breached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
                    avgRating: { $avg: '$rating.stars' },
                    avgResolutionHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$reportedAt'] }, 3600000] } }
                }},
                { $lookup: { from: 'municipalcorporations', localField: '_id', foreignField: '_id', as: 'municipality' } },
                { $unwind: { path: '$municipality', preserveNullAndEmptyArrays: true } },
                { $addFields: {
                    resolutionRate: { $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 100] },
                    performanceScore: { $subtract: [100, { $multiply: [{ $divide: ['$breached', { $max: ['$total', 1] }] }, 50] }] }
                }},
                { $sort: { performanceScore: -1 } },
                { $limit: 20 }
            ]);
            return ApiResponse.success(res, data);
        }

        if (type === 'officer') {
            const data = await Complaint.aggregate([
                { $match: { assignedOfficer: { $exists: true } } },
                { $group: {
                    _id: '$assignedOfficer',
                    total: { $sum: 1 },
                    resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
                    breached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
                    avgRating: { $avg: '$rating.stars' }
                }},
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
                { $unwind: { path: '$officer', preserveNullAndEmptyArrays: true } },
                { $addFields: {
                    performanceScore: {
                        $subtract: [
                            { $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 80] },
                            { $multiply: [{ $divide: ['$breached', { $max: ['$total', 1] }] }, 20] }
                        ]
                    }
                }},
                { $sort: { performanceScore: -1 } },
                { $limit: 20 }
            ]);
            return ApiResponse.success(res, data);
        }

        return ApiResponse.success(res, []);
    } catch (error) { next(error); }
};

export const searchComplaints = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { q, status, category, priority, near, radius = 2000 } = req.query;

        let query: any = {};

        if (q) {
            query.$text = { $search: String(q) };
        }
        if (status) query.status = status;
        if (category) query.category = category;
        if (priority) query.priority = priority;

        if (near) {
            const [lat, lng] = String(near).split(',').map(parseFloat);
            query.geoPoint = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: parseInt(String(radius))
                }
            };
        }

        const complaints = await Complaint.find(query)
            .select('complaintId title category priority status location reportedAt geoPoint')
            .limit(50)
            .sort({ reportedAt: -1 });

        return ApiResponse.success(res, complaints);
    } catch (error) { next(error); }
};

export const getWorkloadBalancing = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { wardId, zoneId, municipalityId } = req.query;

        // Get all officers in this jurisdiction
        const officerQuery: any = { role: { $in: ['field_inspector', 'ward_officer', 'zone_officer'] }, isActive: true };
        if (wardId) officerQuery.wardId = wardId;
        else if (zoneId) officerQuery.zoneId = zoneId;
        else if (municipalityId) officerQuery.municipalityId = municipalityId;

        const officers = await User.find(officerQuery).select('_id name email role wardId zoneId');

        // Count active complaints per officer
        const workloads = await Complaint.aggregate([
            { $match: { assignedOfficer: { $in: officers.map((o: any) => o._id) }, status: { $in: ['assigned', 'accepted', 'in_progress'] } } },
            { $group: { _id: '$assignedOfficer', activeCount: { $sum: 1 } } }
        ]);

        const result = officers.map((o: any) => {
            const wl = workloads.find((w: any) => w._id.toString() === o._id.toString());
            return { officer: o, activeComplaints: wl?.activeCount || 0 };
        }).sort((a: any, b: any) => a.activeComplaints - b.activeComplaints);

        return ApiResponse.success(res, result);
    } catch (error) { next(error); }
};

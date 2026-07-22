import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint';
import { Notification } from '../models/Notification';
import { uploadToCloudinary } from '../utils/cloudinary';
import { MunicipalityService } from './municipalityService';
import { DuplicateDetectionService } from './duplicateDetectionService';
import { SLAService } from './slaService';
import { CATEGORY_PRIORITY, DEFAULT_PRIORITY } from '../config/priorityConfig';

export class ComplaintService {
    private static calculatePriority(category: string, severity: number, traffic: number, population: number) {
        const score = Number(severity) + Number(traffic) + Number(population);
        const catConfig = CATEGORY_PRIORITY[category];
        if (catConfig) return { score, label: catConfig.priority as any };
        let label: any = 'low';
        if (score >= 13) label = 'critical';
        else if (score >= 10) label = 'high';
        else if (score >= 7) label = 'medium';
        return { score, label };
    }

    static async createComplaint(data: any, file: any) {
        const { title, category, location, description, reportedBy, latitude, longitude } = data;
        const severity = parseInt(data.severity) || 3;
        const trafficLevel = parseInt(data.trafficLevel) || 3;
        const populationDensity = parseInt(data.populationDensity) || 3;
        const { score, label } = this.calculatePriority(category, severity, trafficLevel, populationDensity);

        const lat = latitude ? parseFloat(latitude) : undefined;
        const lng = longitude ? parseFloat(longitude) : undefined;

        // --- Duplicate Detection (GPS-based) ---
        if (lat !== undefined && lng !== undefined) {
            const dupCheck = await DuplicateDetectionService.checkDuplicate(category, lng, lat);
            if (dupCheck.isDuplicate && dupCheck.existingComplaint) {
                const err: any = new Error('DUPLICATE_DETECTED');
                err.statusCode = 409;
                err.existingComplaint = dupCheck.existingComplaint;
                throw err;
            }
        }

        // Legacy duplicate check (by location string + category)
        const existingByLocation = await Complaint.findOne({
            category, location, status: { $nin: ['resolved', 'closed'] }
        });
        if (existingByLocation) {
            const err: any = new Error('The complaint has already been raised. Try raising a different complaint.');
            err.statusCode = 409;
            throw err;
        }

        let imageUrl = data.imageUrl || null;
        if (file) imageUrl = await uploadToCloudinary(file, 'complaints');

        // SLA
        const slaHours = SLAService.getSLAHours(category);
        const slaDeadline = SLAService.computeDeadline(category);

        // GeoJSON point
        const geoPoint = (lat !== undefined && lng !== undefined)
            ? { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }
            : undefined;

        const newComplaint = new Complaint({
            complaintId: `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`,
            title, category,
            priority: label,
            severity, trafficLevel, populationDensity,
            priorityScore: score,
            location, description,
            reportedBy: reportedBy || 'Anonymous',
            imageUrl,
            latitude: lat, longitude: lng,
            geoPoint,
            slaHours, slaDeadline,
            aiScore: data.aiScore || Math.floor(Math.random() * 20) + 80,
            attachments: imageUrl ? [{ url: imageUrl, label: 'before', uploadedBy: reportedBy, uploadedAt: new Date() }] : [],
            timeline: [{
                action: 'submitted',
                by: reportedBy || 'Anonymous',
                role: 'citizen',
                comment: 'Complaint submitted by citizen',
                at: new Date(),
            }],
            history: [{
                status: 'submitted',
                updatedBy: reportedBy || 'Anonymous',
                comment: 'Issue reported',
                updatedAt: new Date(),
            }],
        });

        const savedComplaint = await newComplaint.save();

        // Municipality + Zone + Ward + Officer auto-assignment
        let assignedMunicipalityName = '';
        if (lat !== undefined && lng !== undefined) {
            try {
                const assignment = await MunicipalityService.assignMunicipality(lng, lat);
                if (assignment.assignmentMethod !== 'none') {
                    savedComplaint.assignedMunicipality = new mongoose.Types.ObjectId(assignment.municipalityId) as any;
                    savedComplaint.assignedAt = new Date();
                    savedComplaint.assignmentMethod = assignment.assignmentMethod as any;
                    assignedMunicipalityName = assignment.municipalityName;

                    if (assignment.zoneId) savedComplaint.assignedZone = new mongoose.Types.ObjectId(assignment.zoneId) as any;
                    if (assignment.wardId) savedComplaint.assignedWard = new mongoose.Types.ObjectId(assignment.wardId) as any;
                    if (assignment.officerId) {
                        savedComplaint.assignedOfficer = new mongoose.Types.ObjectId(assignment.officerId) as any;
                        savedComplaint.assignedTo = assignment.officerName || assignment.municipalityName;
                        savedComplaint.status = 'assigned';
                        savedComplaint.timeline.push({
                            action: 'auto_assigned',
                            by: 'System',
                            role: 'system',
                            comment: `Auto-assigned to ${assignment.officerName || 'officer'} (${assignment.wardName || assignment.zoneName || assignment.municipalityName})`,
                            at: new Date(),
                        });
                    }
                    await savedComplaint.save();
                }
            } catch (err) {
                console.error('Municipality assignment failed:', err);
            }
        }

        // Notifications
        const locationLabel = assignedMunicipalityName ? `${location} (${assignedMunicipalityName})` : location;
        await new Notification({ recipient: 'admin', message: `New complaint "${title}" in ${locationLabel}.`, type: 'info' }).save();

        if (reportedBy && reportedBy !== 'Anonymous') {
            const msg = assignedMunicipalityName
                ? `Your complaint "${title}" has been submitted and assigned to ${assignedMunicipalityName}.`
                : `Your complaint "${title}" has been submitted successfully.`;
            await new Notification({ recipient: reportedBy, message: msg, type: 'success' }).save();
        }

        const result: any = savedComplaint.toObject();
        result.assignedMunicipalityName = assignedMunicipalityName;
        return result;
    }

    static async getAllComplaints(filters: any, user?: { email: string; role: string }) {
        let query: any = {};
        const { reportedBy, reportedByName, assignedTo, status, priority, category, municipalityId, zoneId, wardId, page, limit } = filters;

        if (reportedBy || reportedByName) {
            const orConditions: any[] = [];
            if (reportedBy) orConditions.push({ reportedBy: String(reportedBy) });
            if (reportedByName) orConditions.push({ reportedBy: String(reportedByName) });
            query.$or = orConditions;
        }
        if (assignedTo) query.assignedTo = assignedTo;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;
        if (municipalityId) query.assignedMunicipality = municipalityId;
        if (zoneId) query.assignedZone = zoneId;
        if (wardId) query.assignedWard = wardId;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .populate('assignedMunicipality', 'name district')
                .populate('assignedOfficer', 'name email role')
                .sort({ reportedAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Complaint.countDocuments(query),
        ]);

        return { complaints, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
    }

    static async updateStatus(id: string, updateData: any, file: any) {
        const { status, comment, updatedBy, updatedByRole } = updateData;
        const complaint = await Complaint.findById(id);
        if (!complaint) throw new Error('Complaint not found');

        let resolvedImageUrl = complaint.resolvedImageUrl;
        if (file) {
            const url = await uploadToCloudinary(file, 'resolutions');
            resolvedImageUrl = url;
            complaint.attachments.push({ url, label: status === 'resolved' ? 'after' : 'during', uploadedBy: updatedBy, uploadedAt: new Date() });
        }

        if (status) {
            complaint.status = status;
            if (status === 'resolved') { complaint.resolvedAt = new Date(); complaint.resolvedImageUrl = resolvedImageUrl; }
            if (status === 'closed') complaint.closedAt = new Date();

            complaint.timeline.push({ action: `status_changed_to_${status}`, by: updatedBy || 'System', role: updatedByRole || 'officer', comment: comment || `Status updated to ${status}`, at: new Date() });
            complaint.history.push({ status, updatedBy: updatedBy || 'System', comment: comment || `Status updated to ${status}`, updatedAt: new Date() });
        }

        const updatedComplaint = await complaint.save();

        if (complaint.reportedBy && complaint.reportedBy !== 'Anonymous') {
            await new Notification({ recipient: complaint.reportedBy, message: `Your complaint "${complaint.title}" status: ${status}.`, type: status === 'resolved' ? 'success' : 'info' }).save();
        }

        return updatedComplaint;
    }

    static async assignComplaint(id: string, assignedTo: string, adminName: string) {
        const complaint = await Complaint.findById(id);
        if (!complaint) throw new Error('Complaint not found');

        complaint.assignedTo = assignedTo;
        complaint.status = 'assigned';
        complaint.timeline.push({ action: 'manually_assigned', by: adminName, role: 'admin', comment: `Assigned to ${assignedTo}`, at: new Date() });
        complaint.history.push({ status: 'assigned', updatedBy: adminName, comment: `Assigned to ${assignedTo}`, updatedAt: new Date() });

        const updatedComplaint = await complaint.save();
        await new Notification({ recipient: assignedTo, message: `Task "${complaint.title}" assigned to you.`, type: 'info' }).save();
        return updatedComplaint;
    }

    static async rateComplaint(id: string, userId: string, ratingData: any) {
        const { stars, review, approvedResolution } = ratingData;
        const complaint = await Complaint.findById(id);
        if (!complaint) throw new Error('Complaint not found');
        if (complaint.status !== 'resolved' && complaint.status !== 'waiting_citizen_review') {
            throw new Error('Complaint must be resolved before rating');
        }

        complaint.rating = { stars, review, approvedResolution, ratedAt: new Date() };

        if (approvedResolution) {
            complaint.status = 'closed';
            complaint.closedAt = new Date();
            complaint.timeline.push({ action: 'resolution_approved_and_closed', by: complaint.reportedBy || 'Citizen', role: 'citizen', comment: review || 'Citizen approved resolution', at: new Date() });
        } else {
            complaint.status = 'reopened';
            complaint.timeline.push({ action: 'resolution_rejected_reopened', by: complaint.reportedBy || 'Citizen', role: 'citizen', comment: review || 'Citizen rejected resolution — complaint reopened', at: new Date() });
            await new Notification({ recipient: 'admin', message: `Complaint "${complaint.title}" was reopened by citizen.`, type: 'warning' }).save();
        }

        return complaint.save();
    }

    static async supportComplaint(id: string, userId: string) {
        await DuplicateDetectionService.supportComplaint(id, userId);
        return Complaint.findById(id).select('_id complaintId title supportCount');
    }

    static async getTimeline(id: string) {
        const complaint = await Complaint.findById(id).select('timeline escalationHistory rating').lean();
        if (!complaint) throw new Error('Complaint not found');
        return complaint;
    }
}

import { Complaint } from '../models/Complaint';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../utils/cloudinary';
import { MunicipalityService } from './municipalityService';

export class ComplaintService {
    private static calculatePriority(severity: number, traffic: number, population: number): { score: number, label: 'low' | 'medium' | 'high' | 'critical' } {
        const score = Number(severity) + Number(traffic) + Number(population);
        let label: 'low' | 'medium' | 'high' | 'critical' = 'low';

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

        const { score, label } = this.calculatePriority(severity, trafficLevel, populationDensity);

        // Check for duplicate complaint
        const existingComplaint = await Complaint.findOne({
            category,
            location,
            status: { $ne: 'resolved' }
        });

        if (existingComplaint) {
            const error: any = new Error('The complaint has already been raised. Try raising another different complaint');
            error.statusCode = 409;
            throw error;
        }

        let imageUrl = data.imageUrl || null;
        if (file) {
            imageUrl = await uploadToCloudinary(file, 'complaints');
        }

        const newComplaint = new Complaint({
            complaintId: `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
            title,
            category,
            priority: label,
            severity,
            trafficLevel,
            populationDensity,
            priorityScore: score,
            location,
            description,
            reportedBy: reportedBy || 'Anonymous',
            imageUrl,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            aiScore: data.aiScore || Math.floor(Math.random() * 20) + 80,
            history: [{
                status: 'submitted',
                updatedBy: reportedBy || 'Anonymous',
                comment: 'Issue reported with smart priority scoring',
                updatedAt: new Date()
            }]
        });

        const savedComplaint = await newComplaint.save();

        // --- Municipality auto-assignment ---
        let assignedMunicipalityName = '';
        if (latitude && longitude) {
            try {
                const assignment = await MunicipalityService.assignMunicipality(
                    parseFloat(longitude),
                    parseFloat(latitude)
                );
                if (assignment.assignmentMethod !== 'none') {
                    savedComplaint.assignedMunicipality = new mongoose.Types.ObjectId(assignment.municipalityId) as any;
                    savedComplaint.assignedAt = new Date();
                    savedComplaint.assignmentMethod = assignment.assignmentMethod as any;
                    await savedComplaint.save();
                    assignedMunicipalityName = assignment.municipalityName;
                }
            } catch (err) {
                // Non-fatal: log but do not block complaint submission
                console.error('Municipality assignment failed:', err);
            }
        }

        // Notifications
        const locationLabel = assignedMunicipalityName
            ? `${location} (assigned to ${assignedMunicipalityName})`
            : location;

        await new Notification({
            recipient: 'admin',
            message: `A new issue "${title}" has been reported in ${locationLabel}.`,
            type: 'info'
        }).save();

        if (reportedBy && reportedBy !== 'Anonymous') {
            const citizenMsg = assignedMunicipalityName
                ? `You have successfully raised the complaint "${title}". It has been assigned to ${assignedMunicipalityName}.`
                : `You have successfully raised the complaint "${title}".`;
            await new Notification({
                recipient: reportedBy,
                message: citizenMsg,
                type: 'success'
            }).save();
        }

        // Return the complaint with assignedMunicipalityName for the success response
        const result: any = savedComplaint.toObject();
        result.assignedMunicipalityName = assignedMunicipalityName;
        return result;
    }

    static async getAllComplaints(filters: any, user?: { email: string; role: string }) {
        let query: any = {};

        // Apply filters passed via query string (e.g. reportedBy or assignedTo) for all roles
        const { reportedBy, reportedByName, assignedTo } = filters;

        if (reportedBy || reportedByName) {
            const orConditions = [];
            if (reportedBy) orConditions.push({ reportedBy: String(reportedBy) });
            if (reportedByName) orConditions.push({ reportedBy: String(reportedByName) });
            query.$or = orConditions;
        }

        if (assignedTo) {
            query.assignedTo = assignedTo;
        }

        return await Complaint.find(query).sort({ reportedAt: -1 });
    }

    static async updateStatus(id: string, updateData: any, file: any) {
        const { status, comment, updatedBy } = updateData;
        const complaint = await Complaint.findById(id);

        if (!complaint) throw new Error('Complaint not found');

        if (file) {
            complaint.resolvedImageUrl = await uploadToCloudinary(file, 'resolutions');
        }

        if (status) {
            complaint.status = status;
            if (status === 'resolved') complaint.resolvedAt = new Date();

            complaint.history.push({
                status,
                updatedBy: updatedBy || 'System',
                comment: comment || `Status updated to ${status}`,
                updatedAt: new Date()
            });
        }

        const updatedComplaint = await complaint.save();

        // Notification logic...
        if (complaint.reportedBy && complaint.reportedBy !== 'Anonymous') {
            let message = `Your issue "${complaint.title}" status has been updated to ${status}.`;
            await new Notification({
                recipient: complaint.reportedBy,
                message,
                type: status === 'resolved' ? 'success' : 'info'
            }).save();
        }

        return updatedComplaint;
    }

    static async assignComplaint(id: string, assignedTo: string, adminName: string) {
        const complaint = await Complaint.findById(id);
        if (!complaint) throw new Error('Complaint not found');

        complaint.assignedTo = assignedTo;
        complaint.history.push({
            status: complaint.status,
            updatedBy: adminName,
            comment: `Assigned to ${assignedTo}`,
            updatedAt: new Date()
        });

        const updatedComplaint = await complaint.save();

        // Notification for worker
        await new Notification({
            recipient: assignedTo,
            message: `A new task "${complaint.title}" has been assigned to you.`,
            type: 'info'
        }).save();

        return updatedComplaint;
    }
}

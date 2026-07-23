import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintStatus =
    | 'submitted'
    | 'verified'
    | 'assigned'
    | 'accepted'
    | 'in_progress'
    | 'waiting_citizen_review'
    | 'resolved'
    | 'closed'
    | 'reopened';

export type ComplaintPriority = 'emergency' | 'critical' | 'high' | 'medium' | 'low';

export interface IComplaintTimeline {
    action: string;
    by: string;
    byUserId?: mongoose.Types.ObjectId;
    role?: string;
    comment?: string;
    imageUrl?: string;
    at: Date;
}

export interface IComplaintRating {
    stars: number; // 1-5
    review?: string;
    approvedResolution: boolean;
    ratedAt: Date;
}

export interface IEscalationEntry {
    escalatedTo: string;
    escalatedToUserId?: mongoose.Types.ObjectId;
    reason: string;
    at: Date;
}

export interface IAttachment {
    url: string;
    label: 'before' | 'during' | 'after' | 'evidence';
    uploadedBy?: string;
    uploadedAt: Date;
}

export interface IComplaint extends Document {
    complaintId: string;
    title: string;
    category: string;
    priority: ComplaintPriority;
    severity: number;
    trafficLevel: number;
    populationDensity: number;
    priorityScore: number;
    location: string;
    description: string;
    status: ComplaintStatus;
    aiScore?: number;
    imageUrl?: string;
    // GeoJSON point for geospatial queries (2dsphere)
    geoPoint?: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };
    latitude?: number;
    longitude?: number;
    // Who reported
    reportedBy?: string;
    reportedByUserId?: mongoose.Types.ObjectId;
    reportedAt: Date;
    // Assignment
    assignedTo?: string;
    assignedWorker?: mongoose.Types.ObjectId;
    assignedMunicipality?: mongoose.Types.ObjectId;
    assignedZone?: mongoose.Types.ObjectId;
    assignedWard?: mongoose.Types.ObjectId;
    assignedOfficer?: mongoose.Types.ObjectId;
    assignedAt?: Date;
    assignmentMethod?: 'polygon' | 'nearest' | 'manual' | 'none';
    // SLA
    slaHours?: number;
    slaDeadline?: Date;
    slaBreached?: boolean;
    // Escalation
    escalationLevel: number;
    escalationHistory: IEscalationEntry[];
    // Timeline
    timeline: IComplaintTimeline[];
    // Legacy history (keep for backward compat)
    history: Array<{
        status: string;
        updatedAt: Date;
        updatedBy: string;
        comment?: string;
    }>;
    // Resolution
    resolvedAt?: Date;
    resolvedImageUrl?: string;
    closedAt?: Date;
    // Citizen rating
    rating?: IComplaintRating;
    // Photo attachments
    attachments: IAttachment[];
    // Duplicate detection
    isDuplicate?: boolean;
    parentComplaintId?: mongoose.Types.ObjectId;
    supportCount: number;
    // Emergency
    isEmergency: boolean;
    emergencyType?: 'flood' | 'earthquake' | 'fire' | 'gas_leak' | 'other';
    // Citizen Verification
    verifiedByCitizens: mongoose.Types.ObjectId[];
    verificationCount: number;
    supportedBy: mongoose.Types.ObjectId[];
    // Weather
    weatherAlert?: string;
    // Infrastructure proximity
    nearbyInfrastructure: string[];
    // Scoring
    severityScore: number;
    // AI predictions
    aiCategory?: string;
    aiPriority?: string;
    aiConfidence?: number;
    // QR
    qrCode?: string;
    // Cost tracking
    estimatedCost?: number;
    actualCost?: number;
    // Contractor
    contractorId?: mongoose.Types.ObjectId;
    // Work tracking
    workStartedAt?: Date;
    workCompletedAt?: Date;
    // Citizen reputation snapshot
    citizenReputation?: number;
}

const complaintSchema = new Schema<IComplaint>({
    complaintId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: {
        type: String,
        required: true,
        enum: ['emergency', 'critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    severity: { type: Number, default: 3 },
    trafficLevel: { type: Number, default: 3 },
    populationDensity: { type: Number, default: 3 },
    priorityScore: { type: Number, default: 9 },
    location: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        default: 'submitted',
        enum: ['submitted','verified','assigned','accepted','in_progress','waiting_citizen_review','resolved','closed','reopened']
    },
    aiScore: { type: Number },
    imageUrl: { type: String },
    // GeoJSON point
    geoPoint: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: { type: [Number] },
    },
    latitude: { type: Number },
    longitude: { type: Number },
    // Reporter
    reportedBy: { type: String, default: 'Anonymous' },
    reportedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedAt: { type: Date, default: Date.now },
    // Assignment
    assignedTo: { type: String, default: '—' },
    assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedMunicipality: { type: Schema.Types.ObjectId, ref: 'MunicipalCorporation' },
    assignedZone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    assignedWard: { type: Schema.Types.ObjectId, ref: 'Ward' },
    assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    assignmentMethod: { type: String, enum: ['polygon','nearest','manual','none'] },
    // SLA
    slaHours: { type: Number },
    slaDeadline: { type: Date },
    slaBreached: { type: Boolean, default: false },
    // Escalation
    escalationLevel: { type: Number, default: 0 },
    escalationHistory: [{
        escalatedTo: { type: String },
        escalatedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        at: { type: Date, default: Date.now },
    }],
    // Timeline
    timeline: [{
        action: { type: String, required: true },
        by: { type: String },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        comment: { type: String },
        imageUrl: { type: String },
        at: { type: Date, default: Date.now },
    }],
    // Legacy history
    history: [{
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        comment: { type: String },
    }],
    // Resolution
    resolvedAt: { type: Date },
    resolvedImageUrl: { type: String },
    closedAt: { type: Date },
    // Rating
    rating: {
        stars: { type: Number, min: 1, max: 5 },
        review: { type: String },
        approvedResolution: { type: Boolean },
        ratedAt: { type: Date },
    },
    // Attachments
    attachments: [{
        url: { type: String, required: true },
        label: { type: String, enum: ['before','during','after','evidence'], default: 'evidence' },
        uploadedBy: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    }],
    // Duplicate detection
    isDuplicate: { type: Boolean, default: false },
    parentComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    supportCount: { type: Number, default: 0 },
    // Emergency
    isEmergency: { type: Boolean, default: false },
    emergencyType: { type: String, enum: ['flood','earthquake','fire','gas_leak','other'] },
    // Citizen Verification
    verifiedByCitizens: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    verificationCount: { type: Number, default: 0 },
    supportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Weather
    weatherAlert: { type: String },
    // Infrastructure proximity
    nearbyInfrastructure: [{ type: String }],
    // Scoring
    severityScore: { type: Number, default: 0 },
    // AI predictions
    aiCategory: { type: String },
    aiPriority: { type: String },
    aiConfidence: { type: Number },
    // QR
    qrCode: { type: String },
    // Cost tracking
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    // Contractor
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor' },
    // Work tracking
    workStartedAt: { type: Date },
    workCompletedAt: { type: Date },
    // Citizen reputation snapshot
    citizenReputation: { type: Number },
}, { timestamps: true });

// 2dsphere index for 20m proximity duplicate detection
complaintSchema.index({ geoPoint: '2dsphere' }, { sparse: true });
complaintSchema.index({ status: 1, reportedAt: -1 });
complaintSchema.index({ assignedMunicipality: 1, status: 1 });
complaintSchema.index({ category: 1, reportedAt: -1 });
complaintSchema.index({ slaDeadline: 1, slaBreached: 1 });
complaintSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });

export const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);
